import boto3 # type: ignore
import os
from pathlib import Path
import typing


bucket_name = os.environ.get('aws_s3_bucket')
access_key = os.environ.get('aws_key_id')
access_secret = os.environ.get('aws_secret_access_key')


# Given Path('src/old/index.html') returns str('old/index.html')
remove_src_folder = lambda path: str(Path(*path.parts[1:]))


def upload_dir(root: str, s3: typing.Any):
	"""
	Recursively uploads files to s3

	:param root str represents a directory path
		e.g. './src' or './src/old/'
	:param s3 botocore.client.s3 object associated with 
		this s3 iam user
	"""

	# This is not a directory
	if not isinstance(root, str) or not os.path.isdir(root):
		return

	# Generate file paths
	files = os.listdir(root)
	filepaths = [os.path.join(root, file) for file in files]

	# Iterate through dir
	for file in filepaths:
		filepath = Path(file)
		args = {}

		# Handle filetype, defaults with bytestream octet
		if os.path.isdir(filepath):
			upload_dir(file, s3)

		elif filepath.suffix == '.html':
			args['ContentType'] = 'text/html'

		elif filepath.suffix == '.js':
			args['ContentType'] = 'application/json'

		elif filepath.suffix == '.css':
			args['ContentType'] = 'text/css'


		s3.upload_file(
			file, 
			bucket_name, 
			remove_src_folder(filepath), 
			ExtraArgs=args
		)
		print(f"Uploaded {file} as /{filepath.name}")


if __name__ == '__main__':
	# Create s3 bucket client
	s3 = boto3.client(
		's3', 
		aws_access_key_id=access_key, 
		aws_secret_access_key=access_secret
	)

	# Check env variables
	if not bucket_name or not access_key or not access_secret:
		print(f"Please set environment variables")
		exit(1)

	upload_dir('./src', s3)
