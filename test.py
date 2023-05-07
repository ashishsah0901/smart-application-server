import torch.optim as optim
import torch.nn.functional as F
from model import SiameseNetwork
from utils import load_checkpoint
from PIL import Image, ImageOps
import torch
import torchvision.transforms as tt

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
LR = 5e-4
TRANS = tt.Compose(
        [
            tt.Resize((100,100)),
            tt.ToTensor()
        ]
    )

model = SiameseNetwork().to(DEVICE)
optimizer = optim.Adam(model.parameters(),lr=LR)
load_checkpoint("my_checkpoint.pth.tar",model,optimizer,LR)

image1 = Image.open('images/image1.jpeg')
image1 = ImageOps.grayscale(image1)
image1 = image1.convert('L')
image1 = TRANS(image1)
image1 = image1.unsqueeze(0)
image2 = Image.open('images/image2.jpeg')
image2 = ImageOps.grayscale(image2)
image2 = image2.convert('L')
image2 = TRANS(image2)
image2 = image2.unsqueeze(0)

output1,output2 = model(image1.to(DEVICE),image2.to(DEVICE))
euclidean_distance = F.pairwise_distance(output1, output2)
# print(euclidean_distance.item())
if euclidean_distance.item() < 2:
    print(1)
else :
    print(0)