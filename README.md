# PORTABLE ₿ BITCOIN NODE

Sovereign Node. Silent Sync. Zero Compromise.
------------------------------------------------------------

Author  : Acreonte (LNAddress: acreonte@blink.sv)

Version : 0.3.1

Network : Bitcoin Mainnet

Ethos   : Verify. Don't Trust.


WELCOME
------------------------------------------------------------
Bitcoin Portable is a lightweight, hardened, privacy-focused
Bitcoin node wrapper designed to run directly from a folder
or USB drive.

No installer.
No registry footprint.
No hidden services.

Plug in. Boot up. Verify.

[Build instructions](BUILD.md)


QUICK START
------------------------------------------------------------
1) Launch
   Double-click: bitcoin-portable.exe

2) Initialize
   The dashboard appears.
   The node starts automatically in the background.

3) Sync
   The yellow progress bar shows initial block download.
   First sync may take time. Sovereignty isn't instant.


OPERATIONAL NOTES
------------------------------------------------------------

[ PORTABILITY ]
All data lives inside:

   data/

You can move the entire folder to another drive or machine.
Your sync progress and configuration move with it.

No system-level dependency.


[ SECURITY MODEL ]
- Local RPC only
- Wallet functionality DISABLED by default

This is a verification node.
Minimal attack surface. Maximum signal integrity.


TROUBLESHOOTING
------------------------------------------------------------

Windows Security / Smart App Control / SmartScreen
   Windows may block the executable for security reasons because it is unsigned.
   Refer to [WINDOWS_TROUBLESHOOTING.md](WINDOWS_TROUBLESHOOTING.md) for how to
   unblock the file or configure your system to allow it.

"Connection lost"
   The node may be restarting or initializing.
   Wait approximately 10 seconds.

Disk Space
   Ensure at least 25-30 GB of free space
   for pruned blockchain data.

Stopping the Node
   ALWAYS click "Stop Node" before:
   - Closing the window
   - Removing the USB drive
   - Shutting down the system

Improper shutdown may cause data corruption.


FOLDER STRUCTURE
------------------------------------------------------------

bitcoin-portable.exe     -> Launcher
bin/bitcoind.exe         -> Bitcoin binary
data/                    -> Blockchain data (delete = re-sync)
logs/                    -> Application logs


Built around the Bitcoin Knots implementation.
Run your own node. Enforce your own consensus.


ACKNOWLEDGMENTS
------------------------------------------------------------

@LukeDashjr
@GrassFedBitcoin
@cguida6
@dathon_ohm
@leo_haf
@oomahq

------------------------------------------------------------
Run sovereign.
FILTERS UP.
------------------------------------------------------------
