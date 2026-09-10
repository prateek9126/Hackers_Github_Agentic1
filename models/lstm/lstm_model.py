"""
Temporal Sequence Forecaster: PyTorch LSTM for SIH26153.
Architecture:
Input: [S(t-n), ..., S(t-1), S(t)]
  ↓
LSTM (stacked, configurable layers)
  ↓
Dropout
  ↓
Dense
  ↓
Softmax
  ↓
Next attack-stage probabilities P(S(t+1))
"""

import os
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader

from states.taxonomy import AttackStage


class TemporalLSTMNetwork(nn.Module):
    """
    PyTorch Neural Network architecture mapping past sequence [S(t-W+1)..S(t)]
    to next stage logits.
    """

    def __init__(
        self,
        input_size: int = 55,
        hidden_size: int = 64,
        num_layers: int = 2,
        dropout: float = 0.2,
        num_classes: int = 10,
    ):
        super().__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.num_classes = num_classes

        # LSTM Layer (batch_first=True -> shape: (Batch, Seq_Len, Input_Size))
        lstm_dropout = dropout if num_layers > 1 else 0.0
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=lstm_dropout,
            batch_first=True,
        )

        self.dropout = nn.Dropout(p=dropout)
        self.fc = nn.Linear(in_features=hidden_size, out_features=num_classes)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        Args:
            x: Tensor of shape (Batch, Seq_Len, Input_Size)
        Returns:
            logits: Tensor of shape (Batch, Num_Classes)
        """
        # lstm_out: (Batch, Seq_Len, Hidden_Size)
        lstm_out, _ = self.lstm(x)
        # Take the output of the final time step S(t)
        last_step_out = lstm_out[:, -1, :]
        dropped = self.dropout(last_step_out)
        logits = self.fc(dropped)
        return logits

    def predict_probabilities(self, x: torch.Tensor) -> torch.Tensor:
        """Compute normalized softmax probabilities P(S(t+1))."""
        logits = self.forward(x)
        return self.softmax(logits)


class TemporalLSTMForecaster:
    """
    High-level trainer, evaluator, and inference wrapper for TemporalLSTMNetwork.
    """

    def __init__(
        self,
        input_size: int = 55,
        sequence_length: int = 4,
        hidden_size: int = 64,
        num_layers: int = 2,
        dropout: float = 0.2,
        num_classes: int = 10,
        learning_rate: float = 0.001,
        weight_decay: float = 1e-5,
        batch_size: int = 16,
        epochs: int = 50,
        early_stopping_patience: int = 10,
        device: Optional[str] = None,
        random_state: int = 42,
    ):
        self.input_size = input_size
        self.sequence_length = sequence_length
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.dropout = dropout
        self.num_classes = num_classes
        self.learning_rate = learning_rate
        self.weight_decay = weight_decay
        self.batch_size = batch_size
        self.epochs = epochs
        self.patience = early_stopping_patience
        self.random_state = random_state

        # Reproducibility
        torch.manual_seed(random_state)
        np.random.seed(random_state)

        if device:
            self.device = torch.device(device)
        else:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.model = TemporalLSTMNetwork(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout,
            num_classes=num_classes,
        ).to(self.device)

        self.criterion = nn.CrossEntropyLoss()
        self.optimizer = optim.Adam(
            self.model.parameters(), lr=learning_rate, weight_decay=weight_decay
        )
        self.training_history: List[Dict[str, float]] = []
        self.is_fitted = False

    def fit(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
    ) -> "TemporalLSTMForecaster":
        """
        Trains the LSTM model with early stopping on validation loss.
        Args:
            X_train: (N, W, D) historical sequence tensor
            y_train: (N, 1) or (N,) future stage targets
        """
        y_tr_flat = np.array(y_train).flatten().astype(np.int64)
        tensor_x = torch.tensor(X_train, dtype=torch.float32)
        tensor_y = torch.tensor(y_tr_flat, dtype=torch.long)

        # Compute balanced class weights for CrossEntropyLoss to handle severe attack imbalance
        classes, counts = np.unique(y_tr_flat, return_counts=True)
        total_samples = len(y_tr_flat)
        class_weights = torch.ones(self.num_classes, dtype=torch.float32)
        for c, cnt in zip(classes, counts):
            if 0 <= c < self.num_classes:
                class_weights[c] = float(total_samples / (len(classes) * cnt))
        self.criterion = nn.CrossEntropyLoss(weight=class_weights.to(self.device))

        dataset = TensorDataset(tensor_x, tensor_y)
        train_loader = DataLoader(dataset, batch_size=self.batch_size, shuffle=False)

        best_val_loss = float("inf")
        patience_counter = 0
        best_state_dict = None

        for epoch in range(1, self.epochs + 1):
            self.model.train()
            total_train_loss = 0.0
            correct = 0
            total = 0

            for batch_x, batch_y in train_loader:
                batch_x = batch_x.to(self.device)
                batch_y = batch_y.to(self.device)

                self.optimizer.zero_grad()
                logits = self.model(batch_x)
                loss = self.criterion(logits, batch_y)
                loss.backward()
                self.optimizer.step()

                total_train_loss += loss.item() * len(batch_y)
                preds = torch.argmax(logits, dim=-1)
                correct += (preds == batch_y).sum().item()
                total += len(batch_y)

            train_loss = total_train_loss / total
            train_acc = correct / total

            # Validation pass
            val_loss = train_loss
            val_acc = train_acc
            if X_val is not None and y_val is not None and len(X_val) > 0:
                self.model.eval()
                with torch.no_grad():
                    vx = torch.tensor(X_val, dtype=torch.float32).to(self.device)
                    vy = torch.tensor(np.array(y_val).flatten(), dtype=torch.long).to(self.device)
                    v_logits = self.model(vx)
                    v_loss = self.criterion(v_logits, vy)
                    val_loss = v_loss.item()
                    v_preds = torch.argmax(v_logits, dim=-1)
                    val_acc = (v_preds == vy).sum().item() / len(vy)

            self.training_history.append({
                "epoch": epoch,
                "train_loss": round(train_loss, 4),
                "train_acc": round(train_acc, 4),
                "val_loss": round(val_loss, 4),
                "val_acc": round(val_acc, 4),
            })

            # Early stopping check
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_state_dict = {k: v.cpu().clone() for k, v in self.model.state_dict().items()}
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= self.patience:
                    break

        if best_state_dict is not None:
            self.model.load_state_dict(best_state_dict)

        self.is_fitted = True
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predicts integer class labels for S(t+1)."""
        probs = self.predict_proba(X)
        return np.argmax(probs, axis=-1)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predicts softmax probability distribution across 10 canonical classes (N, 10)."""
        self.model.eval()
        with torch.no_grad():
            tensor_x = torch.tensor(X, dtype=torch.float32).to(self.device)
            probs = self.model.predict_probabilities(tensor_x)
            return probs.cpu().numpy()

    def save_checkpoint(self, filepath: str):
        """Saves model state dict and full training configuration."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        checkpoint = {
            "model_state_dict": self.model.state_dict(),
            "config": {
                "input_size": self.input_size,
                "sequence_length": self.sequence_length,
                "hidden_size": self.hidden_size,
                "num_layers": self.num_layers,
                "dropout": self.dropout,
                "num_classes": self.num_classes,
                "learning_rate": self.learning_rate,
                "batch_size": self.batch_size,
            },
            "training_history": self.training_history,
        }
        torch.save(checkpoint, filepath)

    @classmethod
    def load_checkpoint(cls, filepath: str, device: Optional[str] = None) -> "TemporalLSTMForecaster":
        """Loads forecaster from serialized PyTorch checkpoint."""
        checkpoint = torch.load(filepath, map_location=device or "cpu")
        cfg = checkpoint["config"]
        instance = cls(
            input_size=cfg["input_size"],
            sequence_length=cfg["sequence_length"],
            hidden_size=cfg["hidden_size"],
            num_layers=cfg["num_layers"],
            dropout=cfg["dropout"],
            num_classes=cfg["num_classes"],
            learning_rate=cfg["learning_rate"],
            batch_size=cfg["batch_size"],
            device=device,
        )
        instance.model.load_state_dict(checkpoint["model_state_dict"])
        instance.training_history = checkpoint.get("training_history", [])
        instance.is_fitted = True
        return instance
