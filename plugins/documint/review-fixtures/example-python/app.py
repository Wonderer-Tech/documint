"""Small demonstration app, intentionally without tests."""
from storage import write_message

def main() -> None:
    write_message("DocuMint fixture")

if __name__ == "__main__":
    main()
