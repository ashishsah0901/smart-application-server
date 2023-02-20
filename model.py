import torch
import torch.nn as nn

class CNNBlock(nn.Module):
    def __init__(self,in_channels,out_channels):
        super(CNNBlock,self).__init__()
        self.conv = nn.Sequential(
            nn.ReflectionPad2d(1),
            nn.Conv2d(in_channels,out_channels,kernel_size=3),
            nn.ReLU(inplace=True),
            nn.BatchNorm2d(out_channels)
        )
    
    def forward(self,x):
        return self.conv(x)

class SiameseNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = CNNBlock(1,4)
        self.conv2 = CNNBlock(4,8)
        self.conv3 = CNNBlock(8,8)
        self.fc1 = nn.Sequential(
             nn.Linear(8*100*100,500),
             nn.ReLU(inplace=True),
             nn.Linear(500,500),
             nn.ReLU(inplace=True),
             nn.Linear(500,5),
        )
    def forward_once(self,x):
        output = self.conv3(self.conv2(self.conv1(x)))
        output = output.view(output.size()[0],-1)
        output = self.fc1(output)
        return output
    def forward(self,input_1,input_2):
        output_1 = self.forward_once(input_1)
        output_2 = self.forward_once(input_2)
        return output_1, output_2
