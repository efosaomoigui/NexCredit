from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

# Generate private key
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)

# Export private key to PEM
private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
).decode('utf-8')

# Export public key to PEM
public_key = private_key.public_key()
public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
).decode('utf-8')

# Format for .env
private_env = private_pem.replace('\n', '\\n')
public_env = public_pem.replace('\n', '\\n')

with open('.env', 'a') as f:
    f.write(f'\nJWT_PRIVATE_KEY="{private_env}"\n')
    f.write(f'JWT_PUBLIC_KEY="{public_env}"\n')

print("Keys generated and added to .env")
