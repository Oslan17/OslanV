# Pop!_OS + Windows Dual Boot on ASUS ROG Zephyrus G14

Setting up dual boot on the G14 is not as straightforward as on a regular laptop — the ROG hardware (especially the GPU switching and the AniMe Matrix) needs specific tooling that isn't in the standard Pop!_OS repos. This is my full setup guide.

## Hardware

- ASUS ROG Zephyrus G14 (2023)
- AMD Ryzen 9 7940HS
- NVIDIA RTX 4060 (8GB) + AMD Radeon 780M (integrated)
- 32 GB LPDDR5
- 1 TB NVMe SSD

## Step 1: Partition Strategy

Before installing anything, shrink the Windows partition from inside Windows:

1. Open **Disk Management** (`diskmgmt.msc`)
2. Right-click the C: drive → **Shrink Volume**
3. Allocate at least 60 GB for Pop!_OS (I used 200 GB)

**Do not let the Pop!_OS installer auto-partition** — it will overwrite the Windows bootloader.

## Step 2: EFI Partition

The G14 uses UEFI. Windows already created an EFI partition (usually 100 MB). We need to expand it — systemd-boot and Windows can coexist in the same EFI partition, but 100 MB fills up fast.

From a live Pop!_OS USB:

```bash
# Identify the EFI partition (usually /dev/nvme0n1p1)
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT

# Resize it to 512 MB using GParted (install if needed)
sudo apt install gparted
sudo gparted
```

In GParted: move the EFI partition's right boundary to add space. You may need to move adjacent partitions first.

## Step 3: Install Pop!_OS

During installation:

- Choose **Custom (Advanced)** partitioning
- Assign your free space: root `/` (ext4), and optionally a swap partition
- **Do not format the EFI partition** — select it and set mount point to `/boot/efi` without formatting
- Disable the bootloader installation option if it tries to overwrite grub — Pop!_OS uses systemd-boot

## Step 4: Configure systemd-boot with Windows Entry

After installing Pop!_OS, boot into it and check the EFI entries:

```bash
sudo bootctl status
```

Add a Windows boot entry manually:

```bash
sudo nano /boot/efi/loader/entries/windows.conf
```

```ini
title   Windows 11
efi     /EFI/Microsoft/Boot/bootmgfw.efi
```

Set Windows as the default (optional):

```bash
sudo nano /boot/efi/loader/loader.conf
```

```ini
default windows.conf
timeout 5
console-mode max
```

Now the boot menu shows both Pop!_OS and Windows with a 5-second timeout defaulting to Windows.

## Step 5: NVIDIA Hybrid Graphics with supergfxctl

The RTX 4060 won't work out of the box on Pop!_OS. You need `supergfxctl` (GPU mode switcher) and `asusctl` (fan curves, AniMe, ROG button bindings). Both need to be compiled from source.

### Build asusctl

```bash
# Install dependencies
sudo apt install git curl build-essential libclang-dev \
  libgtk-3-dev libglib2.0-dev pkg-config

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Clone and build
git clone https://gitlab.com/asus-linux/asusctl.git
cd asusctl
make
sudo make install
sudo systemctl enable asusd --now
```

### Build supergfxctl

```bash
git clone https://gitlab.com/asus-linux/supergfxctl.git
cd supergfxctl
make
sudo make install
sudo systemctl enable supergfxd --now
```

### Switch GPU modes

```bash
# Check current mode
supergfxctl --get

# Switch to integrated only (best battery life)
supergfxctl --mode Integrated

# Switch to hybrid (PRIME offload — recommended for dev work)
supergfxctl --mode Hybrid

# Switch to dedicated NVIDIA only (gaming/ML training)
supergfxctl --mode NVidia
```

A reboot is required when switching modes.

## Step 6: Fan Curves

`asusctl` lets you set custom fan profiles:

```bash
# List available profiles
asusctl -p

# Set balanced profile
asusctl -P Balanced

# Or configure a custom curve
asusctl fan-curve -m balanced -f cpu --data 30c:0%,50c:20%,70c:50%,90c:100%
```

## Notes

- **Secure Boot:** Disable it in BIOS before installing Pop!_OS. You can re-enable it afterward with signed shims, but it's extra work
- **BIOS key:** Press F2 during POST to enter BIOS on the G14
- **AniMe Matrix:** Works with `asusctl` after install. Run `asusctl anime` to configure it
- **Suspend issues:** If suspend/wake is unreliable, add `amdgpu.runpm=0` to kernel parameters in `/boot/efi/loader/entries/Pop_OS-current.conf`

The setup takes about 2 hours total including compilation time. After that, it's a genuinely great Linux machine — the Ryzen 9 is fast, the battery lasts ~6 hours on Integrated mode, and the display is excellent.
