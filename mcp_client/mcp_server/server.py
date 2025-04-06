# server.py
import asyncio
from mcp.server.fastmcp import FastMCP
import pandas as pd
import uuid
from typing import Optional
import platform
import os


tmp_docker = "/tmp"
tmp_host = "C:/Users/Administrator/Desktop/Document/chatx/mcp_client/tmp"

data_path = "C:/Users/Administrator/Desktop/Document/chatx/mcp_client/data"

# Create an MCP server
mcp = FastMCP("biotools")

bed_config = {
    "gene_bed_path": "C:/Users/Administrator/Desktop/Document/chatx/mcp_client/data/gene.bed"
}

bed_data_db = {
    "Enhancer": "/data/human/human_Super_Enhancer_SEdbv2.bed",
    "TR": "/data/human/human_TFBS.bed",
    "SNP": "/data/human/human_Risk_SNP.bed",
}


class DockerTerminalLauncher:
    def __init__(self):
        self.container_name = "transagent"
        self.terminal_proc: Optional[asyncio.subprocess.Process] = None

    async def open_system_terminal(self, docker_cmd: list):
        """打开系统终端并运行Docker命令"""
        if platform.system() == "Windows":
            # Windows使用cmd或PowerShell
            terminal_cmd = [
                "cmd.exe" if os.getenv("COMSPEC") else "powershell.exe",
                "/k",  # 保持窗口打开
                " ".join(docker_cmd),
            ]
        else:
            # Linux/macOS使用默认终端
            terminal_cmd = (
                [
                    "x-terminal-emulator" if platform.system() == "Linux" else "open",
                    "-e",  # 在终端中执行命令
                    " ".join(docker_cmd),
                ]
                if platform.system() == "Linux"
                else [
                    "osascript",
                    "-e",
                    f'tell app "Terminal" to do script "{ " ".join(docker_cmd) }"',
                ]
            )

        self.terminal_proc = await asyncio.create_subprocess_exec(
            *terminal_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            stdin=asyncio.subprocess.PIPE,
        )

    async def start_container_in_terminal(self):
        """在终端中启动并保持容器运行"""
        docker_cmd = [
            "docker",
            "run",
            "-it",
            "--rm",
            "--name",
            self.container_name,
            "-v",
            f"{tmp_host}:{tmp_docker}",
            "-v",
            f"{data_path}:/data",
            "transagent",
            "bash",  # 启动交互式shell
        ]

        await self.open_system_terminal(docker_cmd)


async def main():
    launcher = DockerTerminalLauncher()
    # 启动终端和容器
    await launcher.start_container_in_terminal()
    # MCP server
    mcp.run()


@mcp.tool()
async def execute_bash(
    cmd: str = "echo hello!", timeout: Optional[float] = 600.0
) -> str:
    """
    Execute the bash tool with the given command.

    当前工具可以用于复杂的生物信息分析流程，包括复杂的数据分析，绘图和系统级别指令调用。已经安装的工具如下：
    - homer: 用于ChIP-seq和motif分析的工具
      Example: `execute_bash("findMotifsGenome.pl peaks.txt hg19 output_dir -size 200 -mask")`
    - deeptools: 用于高通量测序数据的可视化
      Example: `execute_bash("computeMatrix reference-point --referencePoint TSS -b 1000 -a 1000 -R genes.bed -S coverage.bw -out matrix.gz")`
    - chipseeker: 用于ChIP-seq数据的注释
      Example: `execute_bash("Rscript -e 'library(ChIPseeker); peakAnno <- annotatePeak("peaks.bed", tssRegion=c(-1000, 1000), TxDb=TxDb.Hsapiens.UCSC.hg19.knownGene)'")`
    - ucsc-liftover: 用于基因组坐标转换
      Example: `execute_bash("liftOver input.bed hg19ToHg38.over.chain output.bed unmapped.bed")`
    - cistrome_beta: 用于ChIP-seq数据分析的beta版本工具
      Example: `execute_bash("cistrome beta --input peaks.bed --genome hg19 --output output_dir")`
    - fastqc: 用于测序数据的质量控制
      Example: `execute_bash("fastqc seq.fastq -o output_dir")`
    - trim_galore: 用于测序数据的适配器修剪
      Example: `execute_bash("trim_galore --paired --quality 20 --length 20 read1.fastq read2.fastq")`
    - bowtie2: 用于序列比对
      Example: `execute_bash("bowtie2 -x index -1 read1.fastq -2 read2.fastq -S output.sam")`
    - picard: 用于处理高通量测序数据的工具
      Example: `execute_bash("picard MarkDuplicates I=input.bam O=marked_duplicates.bam M=metrics.txt")`
    - macs2: 用于ChIP-seq峰值检测
      Example: `execute_bash("macs2 callpeak -t ChIP.bam -c Control.bam -f BAM -g hs -n output_prefix")`
    - pandas: 用于数据分析和操作
      Example: `execute_bash("python -c 'import pandas as pd; df = pd.read_csv("data.csv"); print(df.head())'")
    - seaborn: 用于数据可视化
      Example: `execute_bash("python -c 'import seaborn as sns; tips = sns.load_dataset("tips"); sns.boxplot(x="day", y="total_bill", data=tips)'")

    Args:
        cmd: The bash command to execute.
        timeout: Timeout time (seconds), None means no timeout.

    Returns:
        The output of the bash command.

    Examples:
        >>> execute_bash("ls -l")
        'total 4\ndrwxr-xr-x 2 root root 4096 Apr  5 12:34 data'
    """

    try:
        command = ["docker", "exec", "transagent", cmd]
        command = " ".join(command)
        print(f"Executing: {command}")  # 打印完整命令用于调试

        # 关键修改：使用 create_subprocess_exec 并合并 stderr 到 stdout
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,  # 将 stderr 重定向到 stdout
        )

        try:
            # 读取所有输出（合并 stdout 和 stderr）
            output, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            output_str = output.decode("utf-8", errors="replace").strip()

            if proc.returncode != 0:
                return f"Command failed (exit {proc.returncode}):\n{output_str}"

            return (
                output_str
                if output_str
                else "Command executed successfully (no output)"
            )

        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return f"Command timed out after {timeout} seconds"

    except Exception as e:
        return f"Execution error: {str(e)}"


@mcp.tool()
def get_bed_data(biological_type: str) -> str:
    """
    Get bed data for a given biological type.

    Args:
        biological_type: Type of biological element (Enhancer, TR, SNP)

    Returns:
        The path to the [biological_type]-bed file.
    """
    if biological_type in bed_data_db:
        return bed_data_db[biological_type]
    return "Biological type {biological_type} not found in database"


# Add gene position query tool
@mcp.tool()
def gene_position_query(genes: list = ["TP53"]) -> str:
    """Query the positions of genes and return a Gene-bed file path.

    Args:
        genes: A list of gene names (e.g. TP53).

    Returns:
        The path to the Gene-bed file.
    """
    gene_bed = pd.read_csv(
        bed_config["gene_bed_path"], index_col=None, header=None, sep="\t"
    )
    gene_position = gene_bed[gene_bed[4].map(lambda gene: gene in genes)]
    uuid_ = uuid.uuid1()
    host_gene_position_path = f"{tmp_host}/gene_position_{uuid_}.bed"
    docker_gene_position_path = f"{tmp_docker}/gene_position_{uuid_}.bed"
    gene_position.to_csv(host_gene_position_path, header=False, index=False, sep="\t")
    return docker_gene_position_path


# Add an addition tool
@mcp.tool()
async def execute_bedtools(
    subcommand: str = "intersect",
    options: str = "--help",
    timeout: Optional[float] = 600.0,
) -> str:
    """bedtools is a powerful toolset for genome arithmetic.

    Args:
        subcommand: The bedtools sub-commands (e.g. intersect).
        options: The parameter list of the sub-command (e.g. "-a a.bed -b b.bed -u"]).
        timeout: Timeout time (seconds), None means no timeout.

    Returns:
        The path to the result-bed file.

    The bedtools sub-commands include:

    [ Genome arithmetic ]
        intersect     Find overlapping intervals in various ways.
        window        Find overlapping intervals within a window around an interval.
        closest       Find the closest, potentially non-overlapping interval.
        coverage      Compute the coverage over defined intervals.
        map           Apply a function to a column for each overlapping interval.
        genomecov     Compute the coverage over an entire genome.
        merge         Combine overlapping/nearby intervals into a single interval.
        cluster       Cluster (but don't merge) overlapping/nearby intervals.
        complement    Extract intervals _not_ represented by an interval file.
        shift         Adjust the position of intervals.
        subtract      Remove intervals based on overlaps b/w two files.
        slop          Adjust the size of intervals.
        flank         Create new intervals from the flanks of existing intervals.
        sort          Order the intervals in a file.
        random        Generate random intervals in a genome.
        shuffle       Randomly redistrubute intervals in a genome.
        sample        Sample random records from file using reservoir sampling.
        spacing       Report the gap lengths between intervals in a file.
        annotate      Annotate coverage of features from multiple files.

    [ Multi-way file comparisons ]
        multiinter    Identifies common intervals among multiple interval files.
        unionbedg     Combines coverage intervals from multiple BEDGRAPH files.

    [ Paired-end manipulation ]
        pairtobed     Find pairs that overlap intervals in various ways.
        pairtopair    Find pairs that overlap other pairs in various ways.

    [ Format conversion ]
        bamtobed      Convert BAM alignments to BED (& other) formats.
        bedtobam      Convert intervals to BAM records.
        bamtofastq    Convert BAM records to FASTQ records.
        bedpetobam    Convert BEDPE intervals to BAM records.
        bed12tobed6   Breaks BED12 intervals into discrete BED6 intervals.

    [ Fasta manipulation ]
        getfasta      Use intervals to extract sequences from a FASTA file.
        maskfasta     Use intervals to mask sequences from a FASTA file.
        nuc           Profile the nucleotide content of intervals in a FASTA file.

    [ BAM focused tools ]
        multicov      Counts coverage from multiple BAMs at specific intervals.
        tag           Tag BAM alignments based on overlaps with interval files.

    [ Statistical relationships ]
        jaccard       Calculate the Jaccard statistic b/w two sets of intervals.
        reldist       Calculate the distribution of relative distances b/w two files.
        fisher        Calculate Fisher statistic b/w two feature files.

    [ Miscellaneous tools ]
        overlap       Computes the amount of overlap from two intervals.
        igv           Create an IGV snapshot batch script.
        links         Create a HTML page of links to UCSC locations.
        makewindows   Make interval "windows" across a genome.
        groupby       Group by common cols. & summarize oth. cols. (~ SQL "groupBy")
        expand        Replicate lines based on lists of values in columns.
        split         Split a file into multiple files with equal records or base pairs.
    """

    try:
        uuid_ = uuid.uuid1()
        host_out_path = f"{tmp_host}/result_bed_{uuid_}.bed"
        docker_out_path = f"{tmp_docker}/result_bed_{uuid_}.bed"

        command = [
            "docker",
            "exec",
            "transagent",
            "bedtools",
            subcommand,
            options,
        ]

        # 打印可复制的完整命令
        command = " ".join(command)

        # 使用 create_subprocess_exec 避免 shell 解析问题
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return f"Timeout after {timeout}s"

        if proc.returncode != 0:
            return stderr.decode().strip()

        # 写入结果文件
        with open(host_out_path, "w") as f:
            f.write(stdout.decode())
        return docker_out_path

    except Exception as e:
        return str(e)


if __name__ == "__main__":
    asyncio.run(main())
