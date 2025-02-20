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
def get_gse_infos(content):
    target_fields = [
        "Title",
        "Summary",
        "Overall design",
        "Citation(s)",
    ]
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


def get_llm_infos(query):
    with open("system_prompt.md", "r", encoding="utf8") as file:
        system_prompt = file.read()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(query)},
            ],
            stream=False,
        )
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
    gse_id = "GSE140493"
    gsm_id = "GSM4167984"
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
