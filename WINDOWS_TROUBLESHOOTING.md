# Windows Security & Smart App Control Troubleshooting

When running `bitcoin-portable.exe` or compiling the project on Windows 11, you may encounter security blockages from Windows Defender, SmartScreen, or **Smart App Control (SAC)**.

This document explains why this happens, how to resolve it for your tools, and how the app automatically handles security blocks for its backend services.

---

## 1. Symptoms of Application Control Blocks

### For Users
When double-clicking `bitcoin-portable.exe`, Windows flags the file as blocked **"for security reasons"** with a link to Microsoft's Smart App Control FAQ.

### For Developers
When running build commands like `cargo build` or `cargo check` in PowerShell, you may see:
```text
error: command failed: 'cargo': Una directiva de Control de aplicaciones bloqueó este archivo. (os error 4551)
```
*(Translation: "An Application Control policy blocked this file.")*

---

## 2. Why does this happen?

`bitcoin-portable` is an open-source, sovereign local project. Because the binaries are compiled locally:
1. **Unsigned Status:** They lack a digital signature issued by a trusted Certificate Authority (CA) recognized by the Microsoft Trusted Root Program.
2. **No Cloud Reputation:** The binaries are unique to your local compilation or lack widespread distribution, so Microsoft's Intelligent Security Graph does not recognize them as safe.

If **Smart App Control (SAC)** is enabled in **On** mode, it strictly blocks *all* unsigned development tools (like local Rust/cargo compilers) and unsigned applications (like `bitcoin-portable.exe`).

---

## 3. How to Resolve Blocks

### Step 1: Configure Smart App Control for Local Development
If you compile code, test local builds, or use unsigned command-line tools:
1. Open the Windows Start menu and search for **Windows Security**.
2. Navigate to **App & browser control** > **Smart App Control settings**.
3. Configure the setting:
   *   **On:** Blocks all unsigned developer tools and binaries. (Change this to test/build).
   *   **Evaluation:** Only runs logs of blocked files. You can manually run/unblock items.
   *   **Off:** Smart App Control is disabled. Warnings revert back to standard Windows Defender SmartScreen (which allows running files after clicking "More Info" -> "Run anyway").
4. **Action:** Set Smart App Control to **Evaluation** or **Off** to build and test.

---

### Step 2: Unblocking the Main Executable
Once Smart App Control is in **Evaluation** or **Off** mode, you only need to unblock the main launcher GUI (`bitcoin-portable.exe`) once:

#### Manual Unblock:
1. Right-click `bitcoin-portable.exe` and select **Properties**.
2. On the **General** tab, check the **Unblock** checkbox in the Security section at the bottom.
3. Click **Apply** and **OK**.

---

## 4. Automatic Child Process Unblocking (No PowerShell Needed)

Previously, if you downloaded the files as a ZIP or cloned them, the companion binaries (`bin/bitcoind.exe` and `bin/tor.exe`) would inherit the "Mark of the Web" and get blocked when the main GUI tried to spawn them.

**This is now fully automated:**
The Rust backend of `bitcoin-portable.exe` automatically checks and removes the NTFS "Mark of the Web" metadata (`Zone.Identifier` alternate data stream) from `bitcoind.exe` and `tor.exe` right before spawning them. 

You **do not need** to run any manual PowerShell commands to unblock the background files. Unblocking or running the main GUI is sufficient.
