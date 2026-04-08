import os
import shutil
import subprocess
import sys
import zipfile


def main():
    # Always run relative to this script so `python deploy.py` works from any cwd
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)

    print("Creating Lambda deployment package...")

    # Clean up
    if os.path.exists("lambda-package"):
        shutil.rmtree("lambda-package")
    if os.path.exists("lambda-deployment.zip"):
        os.remove("lambda-deployment.zip")

    # Create package directory
    os.makedirs("lambda-package")

    # Install Linux-compatible dependencies targeting Lambda's Python 3.12 runtime.
    # uv's venv has no bundled pip — use `uv pip`, not `python -m pip`.
    print("Installing Linux-compatible dependencies...")
    uv = shutil.which("uv")
    if not uv:
        print(
            "error: `uv` not found on PATH. Install uv (https://docs.astral.sh/uv/) "
            "or use a venv that includes pip and run: python -m pip install ...",
            file=sys.stderr,
        )
        sys.exit(1)
    subprocess.run(
        [
            uv,
            "pip",
            "install",
            "--python-version",
            "3.12",
            "--python-platform",
            "x86_64-manylinux2014",
            "--only-binary",
            ":all:",
            "--target",
            "lambda-package",
            "-r",
            "requirements.txt",
            "--upgrade",
        ],
        check=True,
    )

    # Copy application files (must sit at zip root). Lambda handler (Console → Configuration → Runtime settings):
    #   lambda_handler.handler          — recommended (Mangum entrypoint in lambda_handler.py)
    #   lambda_function.lambda_handler  — optional shim (lambda_function.py) for older tutorials using that name
    print("Copying application files...")
    for name in [
        "server.py",
        "lambda_handler.py",
        "lambda_function.py",
        "context.py",
        "resources.py",
    ]:
        src = os.path.join(backend_dir, name)
        if os.path.exists(src):
            shutil.copy2(src, "lambda-package/")
        else:
            print(f"warning: missing {name}, package may be incomplete", file=sys.stderr)

    data_dir = os.path.join(backend_dir, "data")
    if os.path.exists(data_dir):
        shutil.copytree(data_dir, "lambda-package/data")

    # Create zip
    print("Creating zip file...")
    with zipfile.ZipFile("lambda-deployment.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("lambda-package"):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, "lambda-package")
                zipf.write(file_path, arcname)

    size_mb = os.path.getsize("lambda-deployment.zip") / (1024 * 1024)
    print(f"Created lambda-deployment.zip ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
