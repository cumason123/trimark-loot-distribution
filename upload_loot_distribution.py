import boto3
import os
from pathlib import Path


if __name__ == '__main__':
	# Will only upload files not directories
	root = Path('./apps/loot_distribution')
	files = os.listdir(root)
	filepaths = [os.path.join(root, file) for file in files]

	bucket_name = os.environ.get('aws_s3_bucket')
	access_key = os.environ.get('aws_key_id')
	access_secret = os.environ.get('aws_secret_access_key')

	if not bucket_name or not access_key or not access_secret:
		print(f"Please set environment variables")
		exit(1)

	s3 = boto3.client(
		's3', 
		aws_access_key_id=access_key, 
		aws_secret_access_key=access_secret
	)

	for file in filepaths:
		filepath = Path(file)
		args = {}

		if filepath.suffix == '.html':
			args['ContentType'] = 'text/html'

		elif filepath.suffix == '.js':
			args['ContentType'] = 'application/json'

		elif filepath.suffix == '.css':
			args['ContentType'] = 'text/css'

		s3.upload_file(
			file, 
			bucket_name, 
			filepath.name, 
			ExtraArgs=args
		)
		print(f"Uploaded {file} as /{filepath.name}")
