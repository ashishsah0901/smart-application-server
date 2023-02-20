import torch
import torchvision.transforms as tt
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
TRAIN_DIR = "data/faces/training"
VAL_DIR = "data/faces/testing"
LOAD_MODEL = False
SAVE_MODEL = True
BATCH_SIZE = 64
EPOCHS = 100
LR = 5e-4
TRANS = tt.Compose(
        [
            tt.Resize((100,100)),
            tt.ToTensor()
        ]
    )