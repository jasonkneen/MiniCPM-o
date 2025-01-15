import torch
import sys

def check_pytorch_installation():
    print(f"PyTorch Version: {torch.__version__}")
    print(f"Python Version: {sys.version}")
    
    # Check MPS availability
    print("\nMPS (Metal Performance Shaders) Support:")
    print(f"MPS available: {torch.backends.mps.is_available()}")
    print(f"MPS built: {torch.backends.mps.is_built()}")
    
    # Check CUDA availability
    print("\nCUDA Support:")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA version: {torch.version.cuda}")
        print(f"Current CUDA device: {torch.cuda.current_device()}")
        print(f"CUDA device name: {torch.cuda.get_device_name(0)}")

    # Test MPS functionality if available
    if torch.backends.mps.is_available():
        try:
            # Create a small tensor and move it to MPS
            test_tensor = torch.zeros(1).to('mps')
            print("\nSuccessfully created tensor on MPS device")
            del test_tensor
        except Exception as e:
            print(f"\nError when trying to use MPS device: {str(e)}")

    # Show available devices
    print("\nAvailable Devices:")
    print(f"CPU: Always available")
    print(f"MPS: {'Available' if torch.backends.mps.is_available() else 'Not available'}")
    print(f"CUDA: {'Available' if torch.cuda.is_available() else 'Not available'}")

if __name__ == "__main__":
    check_pytorch_installation()

