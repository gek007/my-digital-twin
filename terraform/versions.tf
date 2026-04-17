terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "eu-west-1"
}

# ACM certs for CloudFront must be in us-east-1 (AWS requirement). Only those resources use this alias.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}