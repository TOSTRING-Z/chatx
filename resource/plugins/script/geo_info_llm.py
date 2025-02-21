import requests
from bs4 import BeautifulSoup
import time
from requests.exceptions import ConnectionError
from openai import OpenAI
from openpyxl import Workbook, load_workbook
import json
import re

# global
client = OpenAI(
    api_key="sk-vzZxxJOoMtkTHTgVuc8pJgCxl9nwnD7L1useLhndLUr6RBAD",
    base_url="https://gptgod.online/api/v1",
)

system_prompt = """
## As a biology expert, you are required to complete the following requirements:

Please extract key information from the JSON data provided by the user.

The explanation of the fields returned is as follows:

- OrganizationType (The tissue type of the current context, such as blood, brain, retina, etc.)
- SequencingPlatform (The sequencing platform of the current context, such as 10x Genomics, etc.)
- DiseaseType (The disease type of the current context, such as Normal, Disease, Tumor, Cancer, Malignant tumor, etc.)
- SpecificDiseaseName (The full name of the disease, abbreviations are not allowed)
- CellName (The name of the cells mentioned in the article for flow cytometry screening, positive is represented by "+" in English, the full name of the cell line, no abbreviations, capitalize the first letter and use lowercase for the rest, use plural forms)
- CellLine (Abbreviation for cell line)
- BiologicalSampleType (Such as Primary cells, Cell line, Tissue, Stem cell)
- PMID (The Citation(s) corresponding to the current context)
- Title (The title corresponding to the current context)

Please ensure to return only a structured result, using JSON format and strictly adhering to the following fields:

- OrganizationType
- SequencingPlatform
- DiseaseType
- SpecificDiseaseName
- CellName
- CellLine
- BiologicalSampleType
- PMID
- Title

do not return multiple results or additional explanations.
"""


def retry(max_retries=3):
    def decorator_1(func):
        def decorator_2(*parmas):
            retry_count = 0
            retry_delay = 5
            while retry_count < max_retries:
                try:
                    return func(*parmas)
                except ConnectionError as e:
                    print(f"{retry_delay}秒后重试... ({retry_count + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_count += 1

        return decorator_2

    return decorator_1


def get_content(url):
    with requests.Session() as session:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0"
        }
        session.headers.update(headers)
        response = session.get(url, verify=False)
        response.encoding = "utf-8"
        response.raise_for_status()
        return response.text


def run_gsx(content, target_fields):
    soup = BeautifulSoup(content, "html.parser")
    result = {field: "" for field in target_fields}

    for tr in soup.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) >= 2:

            field_name = tds[0].get_text(strip=True)
            if field_name in target_fields:
                field_value = tds[1].get_text("\n", strip=False)
                result[field_name] = field_value.strip()
    return result


@retry(max_retries=5)
def get_gsm_infos(content):
    target_fields = [
        "Status",
        "Sample type",
        "Source name",
        "Organism",
        "Characteristics",
        "Treatment protocol",
        "Library strategy",
        "Library source",
        "Library selection",
        "Instrument model",
        "Description",
        "BioSample",
        "SRA",
    ]
    return run_gsx(content, target_fields)


@retry(max_retries=5)
def get_gse_infos(content):
    target_fields = [
        "Title",
        "Summary",
        "Overall design",
        "Citation(s)",
    ]
    return run_gsx(content, target_fields)


@retry(max_retries=5)
def get_llm_infos(query):
    history = [
        {
            "role": "user",
            "content": '{"Title": "Multi-omic profiling of single nuclei uncovers regulatory diversity of brain cell types and diseases", "Summary": "Most existing single-cell techniques can only make one type of molecular measurements. Although computational approaches have been developed to integrate single-cell datasets, their efficacy still needs to be determined with reference to authentic single-cell multi-omic profiles. To address this challenge, we devised single-nucleus methylCytosine, Chromatin accessibility and Transcriptome sequencing (snmC2T-seq) and applied the approach to post-mortem human frontal cortex tissue. We developed a computational framework to evaluate the quality of finely defined cell types using multi-modal information and validated the efficacy of computational multi-omic integration methods. Correlation analysis in individual cells revealed gene groups showing distinct relations between methylation and expression. Integration of snmC2T-seq with other multi- and single- modal datasets enabled joint analyses of the methylome, chromatin accessibility, transcriptome, and chromatin architecture for 63 human cortical cell types. We reconstructed the regulatory lineage of these cortical cell types and found pronounced cell-type-specific enrichment of disease risks for neuropsychiatric traits, predicting causal cell types that can be targeted for treatment.", "Overall design": "snmC2T-seq and snATAC-seq", "Citation(s)": "35419551", "Status": "Public on Dec 12, 2019", "Sample type": "SRA", "Source name": "Human frontal cortex", "Organism": "Homo sapiens", "Characteristics": "cell type: Human frontal cortex\\nSex: Male\\ndonor: NDARKD326LNK\\nprotocol: snmC-seq", "Treatment protocol": "", "Library strategy": "OTHER", "Library source": "genomic", "Library selection": "other", "Instrument model": "Illumina HiSeq 4000", "Description": "", "BioSample": "SAMN13302036", "SRA": "SRX7162302"}',
        },
        {
            "role": "assistant",
            "content": '{\n  "OrganizationType": "brain",\n  "SequencingPlatform": "Illumina HiSeq 4000",\n  "DiseaseType": "Disease",\n  "SpecificDiseaseName": "neuropsychiatric traits",\n  "CellName": "Human cortical cell types",\n  "CellLine": "N/A",\n  "BiologicalSampleType": "Tissue",\n  "PMID": "35419551",\n  "Title": "Multi-omic profiling of single nuclei uncovers regulatory diversity of brain cell types and diseases"\n}',
        },
        {
            "role": "user",
            "content": '{"Title": "Single-cell epigenomic identification of inherited risk loci in Alzheimer\\u2019s and Parkinson\\u2019s disease", "Summary": "Genome-wide association studies (GWAS) have identified thousands of variants associated with disease phenotypes. However, the majority of these variants do not alter coding sequences, making it difficult to assign their function. To this end, we present a multi-omic epigenetic atlas of the adult human brain through profiling of the chromatin accessibility landscapes and three-dimensional chromatin interactions of seven brain regions across a cohort of 39 cognitively healthy individuals. Single-cell chromatin accessibility profiling of 70,631 cells from six of these brain regions identifies 24 distinct cell clusters and 359,022 cell type-specific regulatory elements, capturing the regulatory diversity of the adult brain. We develop a machine learning classifier to integrate this multi-omic framework and predict dozens of functional single nucleotide polymorphisms (SNPs), nominating gene and cellular targets for previously orphaned GWAS loci. These predictions both inform well-studied disease-relevant genes, such as BIN1 in microglia for Alzheimer\\u2019s disease (AD) and reveal novel gene-disease associations, such as STAB1 in microglia and MAL in oligodendrocytes for Parkinson\\u2019s disease (PD). Moreover, we dissect the complex inverted haplotype of the MAPT (encoding tau) PD risk locus, identifying ectopic enhancer-gene contacts in neurons that increase MAPT expression and may mediate this disease association. This work greatly expands our understanding of inherited variation in AD and PD and provides a roadmap for the epigenomic dissection of noncoding regulatory variation in disease.", "Overall design": "Bulk ATAC-seq, single-cell ATAC-seq and HiChIP", "Citation(s)": "33106633\\n, \\n38781344", "Status": "Public on Jul 26, 2020", "Sample type": "SRA", "Source name": "Primary brain samples acquired post-mortem, Caudate", "Organism": "Homo sapiens", "Characteristics": "tissue: brain\\nbrain region: Caudate", "Treatment protocol": "Primary brain samples were acquired post-mortem with IRB-approved informed consent. Human donor sample sizes were chosen to provide sufficient confidence to validate methodological  conclusions. Human brain samples were collected with an average post-mortem interval of 3.9  hours (range 2.0 \\u2013 6.9 hours). Macrodissected brain regions were flash frozen in liquid nitrogen.  Some samples were embedded in Optimal Cutting Temperature (OCT) compound. All samples  were stored at -80\\u00b0C until use.", "Library strategy": "ATAC-seq", "Library source": "genomic", "Library selection": "other", "Instrument model": "Illumina HiSeq 4000", "Description": "bulkATAC_CTRL_CAUD_14_0586", "BioSample": "SAMN14479818", "SRA": "SRX8020351"}',
        },
        {
            "role": "assistant",
            "content": '{\n  "OrganizationType": "brain",\n  "SequencingPlatform": "Illumina HiSeq 4000",\n  "DiseaseType": "Disease",\n  "SpecificDiseaseName": "Alzheimer’s disease",\n  "CellName": "microglia",\n  "CellLine": "MC",\n  "BiologicalSampleType": "Primary cells",\n  "PMID": "33106633, 38781344",\n  "Title": "Single-cell epigenomic identification of inherited risk loci in Alzheimer’s and Parkinson’s disease"\n}',
        },
        {
            "role": "user",
            "content": '{"Title": "Single-cell assay for transposase-accessible chromatin sequencing of human clear cell renal cell carcinoma", "Summary": "In recent years, with the development of single-cell sequencing technology, it has become possible to perform single-cell assay for transposase-accessible chromatin sequencing (scATAC-seq), especially the high-throughput single-cell analysis. Here, we provide a high-quality chromatin accessibility data for ccRCC at single-cell level. Performing high-throughput scATAC-seq on 3 human ccRCC samples (RCC30, RCC61 and RCC76), we obtained a total of 18,703 high quality nuclei and 104,818 unique peaks, including coding, non-coding regions, promoters and enhancers.we demonstrate a complete analysis process for scATAC-seq data, and makes the application more feasible and convenient.", "Overall design": "ccRCC samples from 3 patients were used for single-cell ATAC sequencing by 10X Genomics.", "Citation(s)": "", "Status": "Public on Jan 24, 2025", "Sample type": "SRA", "Source name": "Clear cell renal cell carcinoma", "Organism": "Homo sapiens", "Characteristics": "tissue: Total clear cell renal cell carcinoma Homogenate", "Treatment protocol": "", "Library strategy": "ATAC-seq", "Library source": "transcriptomic single cell", "Library selection": "other", "Instrument model": "Illumina NovaSeq 6000", "Description": "", "BioSample": "SAMN42227057", "SRA": "SRX25179813"}',
        },
        {
            "role": "assistant",
            "content": '{\n  "OrganizationType": "Clear cell renal cell carcinoma",\n  "SequencingPlatform": "10X Genomics",\n  "DiseaseType": "Tumor",\n  "SpecificDiseaseName": "Clear cell renal cell carcinoma",\n  "CellName": "Nuclei",\n  "CellLine": "ccRCC",\n  "BiologicalSampleType": "Tissue",\n  "PMID": "",\n  "Title": "Single-cell assay for transposase-accessible chromatin sequencing of human clear cell renal cell carcinoma"\n}',
        },
        {
            "role": "user",
            "content": '{"Title": "Comparative analysis of chromatin accessibility during chondrogenesis and in osteoarthritis", "Summary": "To reveal the organisation of the cartilage cell chondrocyte genome and identify changes that occur within this organisation during development and due to osteoarthritis (OA).  Methods  Assay for Transposase -Accessible Chromatin using Sequencing (ATAC-seq) was performed on chondrocytes isolated from 16 patients undergoing total hip replacement because of OA (n=7) or due to a neck of femur fracture (NOF, n=9). ATAC-seq was similarly performed on bone-marrow mesenchymal stem cells (BM-MSC) and differentiated chondrocytes of two donors. DNA sequence reads (av. 50 million/sample) were aligned to human genome Hg38. Peaks were called using MACS2 and differential accessibility identified by DiffBind. Interexperiment comparisons and intersection with published gene expression changes, chondrogenesis ChIP-seq, knee ATAC-seq and human tissue scATAC-seq were performed in Galaxy and R. OA GWAS signal regions were overlapped with our defined chondrocyte ATAC-seq peaks.   Results  In BM-MSC and derived chondrocytes we mapped 138005 open chromatin regions, of which 20979 and 50699 significantly increased and decreased respectively during cell differentiation. In hip chondrocytes we identified 115295 open chromatin regions, 1383 and 573 were more or less differentially accessible respectively when comparing OA with NOF samples. In both data sets \\u2018newly accessible regions were enriched at enhancer regions (defined by ChIP-seq). Comparing the data with the ATAC-seq from the single cell ATLAS we identified 11866 open regions exclusive to chondrocytes. Genes associated with these regions were significantly enriched for cartilage-related gene ontology terms. Taking the 420 OA GWAS signals present in the GWAS catalogue, 313 of the OA regions (defined as lead SNP + proxy SNPs with r2 \\u2265 0.8) overlapped with a chondrocyte ATAC-seq region.   Conclusions  Here we have mapped chromatin accessible region changes during chondrogenesis, showing that newly accessible regions are enriched at enhancer regions and positively correlate with gene expression. Open chromatin region changes between OA and NOF cartilage were fewer, and peak differences were subtle. Overall, we have associated OA GWAS loci with accessible regions and defined regions of the genome specific to cartilage and chondrogenesis.", "Overall design": "To reveal the organisation of the cartilage cell chondrocyte genome and identify changes that occur within this organisation during development and due to osteoarthritis (OA). Assay for Transposase -Accessible Chromatin using Sequencing (ATAC-seq) was performed on chondrocytes isolated from 16 patients undergoing total hip replacement because of OA (n=7) or due to a neck of femur fracture (NOF, n=9). ATAC-seq was similarly performed on bone-marrow mesenchymal stem cells (BM-MSC) and differentiated chondrocytes of two donors", "Citation(s)": "", "Status": "Public on Jan 01, 2025", "Sample type": "SRA", "Source name": "mesenchymal stem cells", "Organism": "Homo sapiens", "Characteristics": "tissue: mesenchymal stem cells\\ncell type: mesenchymal stem cells\\ntime: Day0\\nSex: female\\nage: 24\\ntreatment: chondrogenic differentiation", "Treatment protocol": "Chondrogenic differentiation of MSCs was induced with high glucose DMEM containing 100 \\u00b5g/ml sodium pyruvate, 10 ng/ml TGF-\\u03b23, 100 nM dexamethasone, 1x ITS-1 premix, 40 \\u00b5g/ml proline, and 25 \\u00b5g/ml ascorbate-2-phosphate in 6.5mm diameter, 0.4-\\u00b5m pore size polycarbonate Transwell filters.\\nMedia were replaced every 2/3 days for a duration of 14 days.", "Library strategy": "ATAC-seq", "Library source": "genomic", "Library selection": "other", "Instrument model": "Illumina NovaSeq 6000", "Description": "ATAC_Donor_2454E_MSC.bw", "BioSample": "SAMN42023663", "SRA": "SRX25041334"}',
        },
        {
            "role": "assistant",
            "content": '{\n  "OrganizationType": "mesenchymal stem cells",\n  "SequencingPlatform": "Illumina NovaSeq 6000",\n  "DiseaseType": "Disease",\n  "SpecificDiseaseName": "Osteoarthritis",\n  "CellName": "Mesenchymal stem cells",\n  "CellLine": "MSC",\n  "BiologicalSampleType": "Primary cells",\n  "PMID": "",\n  "Title": "Comparative analysis of chromatin accessibility during chondrogenesis and in osteoarthritis"\n}',
        },
    ]
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": json.dumps(query)},
    ]
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[*history, *messages],
        stream=False,
    )
    print({"role": "user", "content": json.dumps(query)})
    print(response.choices[0].message)
    return response.choices[0].message.content


def get_info_dict(info):
    info_dict = {
        "OrganizationType": None,
        "SequencingPlatform": None,
        "DiseaseType": None,
        "SpecificDiseaseName": None,
        "CellName": None,
        "CellLine": None,
        "BiologicalSampleType": None,
        "PMID": None,
        "Title": None,
    }
    renames = {"CellLine": "SampleName"}
    for key in list(info_dict.keys()):
        items = re.findall(rf'"{key}":\s"(.*?)"', info)
        if items:
            info_dict[key] = items[0]
        if key in renames:
            info_dict[renames[key]] = info_dict[key]
            info_dict.pop(key)
    return info_dict


if __name__ == "__main__":
    gse_id = "GSE252843"
    gsm_id = "GSM8008841"
    content_gse = get_content(
        f"https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc={gse_id}"
    )
    content_gsm = get_content(
        f"https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc={gsm_id}"
    )
    query_gse = get_gse_infos(content_gse)
    query_gsm = get_gsm_infos(content_gsm)
    info = get_llm_infos({**query_gse, **query_gsm})
    info_dict = get_info_dict(info)
    print(info_dict)
