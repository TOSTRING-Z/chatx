import pandas as pd

esmble = pd.read_csv("data/human/hg38_ncbi_ref.bed", sep="\t", header=None)
esmble = esmble[esmble[0].map(lambda x: "_" not in x)]
hg38_refseq = "data/human/hg38_refseq.ucsc"
ucsc_gene = pd.read_csv(hg38_refseq, sep="\t")
ucsc_gene = ucsc_gene[["name", "name2"]]
ucsc_gene.columns = ["GENES", "SYMBOLS"]
ucsc_gene = ucsc_gene.drop_duplicates()
esmble["GENES"] = esmble[3].map(lambda x: x.split(".")[0])
esmble = esmble.merge(ucsc_gene, on="GENES")
esmble = esmble[[0,1,2,5,"SYMBOLS"]]
esmble = esmble.drop_duplicates()
esmble.to_csv("data/gene.bed",sep="\t",index=False,header=False)