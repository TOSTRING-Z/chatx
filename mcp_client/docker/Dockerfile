FROM continuumio/miniconda3

USER root

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai

RUN bash /opt/conda/etc/profile.d/conda.sh
RUN conda install -y bioconda::bedtools
RUN conda install -y bioconda::homer
RUN conda install -y conda-forge::r-base
RUN conda install -y bioconda::deeptools
RUN conda install -y bioconda::bioconductor-chipseeker
RUN conda install -y bioconda::ucsc-liftover
RUN conda create -y -n beta_chip python=2.7.15
RUN conda install -y -n beta_chip bioconda::cistrome_beta
RUN conda install -y bioconda::fastqc
RUN conda install -y grst::trim_galore
RUN conda install -y bioconda::bowtie2
RUN conda install -y bioconda::picard
RUN conda install -y -n beta_chip bioconda::macs2
RUN conda install -y conda-forge::pandas
RUN conda install -y conda-forge::seaborn

LABEL org.opencontainers.image.title="transagent"
