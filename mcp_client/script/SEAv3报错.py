import pandas as pd
sea = pd.read_csv("data/human/human_Super_Enhancer_SEAv3.bed",header=None,sep="\t")
sea.to_csv("data/human/human_Super_Enhancer_SEAv3.bed",header=False,index=False,sep="\t")