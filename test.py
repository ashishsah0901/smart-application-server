import config
import torch.optim as optim
import torch.nn.functional as F
from model import SiameseNetwork
from utils import load_checkpoint
from PIL import Image, ImageOps

model = SiameseNetwork().to(config.DEVICE)
optimizer = optim.Adam(model.parameters(),lr=config.LR)
load_checkpoint("my_checkpoint.pth.tar",model,optimizer,config.LR)

image1 = Image.open('images/image1.png')
image1 = ImageOps.grayscale(image1)
image1 = image1.convert('L')
image1 = config.TRANS(image1)
image1 = image1.unsqueeze(0)
image2 = Image.open('images/image2.png')
image2 = ImageOps.grayscale(image2)
image2 = image2.convert('L')
image2 = config.TRANS(image2)
image2 = image2.unsqueeze(0)

output1,output2 = model(image1.to(config.DEVICE),image2.to(config.DEVICE))
euclidean_distance = F.pairwise_distance(output1, output2)
print(euclidean_distance)
if euclidean_distance.item() < 1.5 :
    print(1)
else :
    print(0)