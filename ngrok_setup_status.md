# Ngrok Setup Status - 2025-10-27

## Current Issue
The ngrok npm package (v5.0.0-beta.2) is getting "tunnel already exists" errors even after calling `ngrok.disconnect()` and `ngrok.kill()`. The ngrok agent seems to persist somewhere and reuse tunnel IDs.

## What We've Done
1. ✅ Created `launch_ngrok.js` - Standalone ES module script to launch ngrok tunnels
2. ✅ Created `ngrok_authtoken.txt` - Contains your ngrok authentication token
3. ✅ Created `ngrok_recovery_codes.txt` - Contains your 10 recovery codes
4. ✅ Added both files to `.gitignore` to prevent committing secrets
5. ✅ Installed ngrok npm package: `npm install ngrok`
6. ✅ Script reads authtoken from file automatically
7. ✅ Script disconnects existing tunnels before creating new ones
8. ❌ Still getting "tunnel already exists" error after disconnect

## Error Details
```
NgrokClientError: invalid tunnel configuration
details: { err: 'tunnel "b809b591-8315-4737-b490-72a29d998cc3" already exists' }
```

Even though we call:
```javascript
await ngrok.disconnect();
await ngrok.kill();
await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
```

The tunnel still persists and causes conflicts.

## Next Steps After Reboot
1. Test if reboot clears the ngrok state
2. Run: `cd /c/_projects/p23_fb_hub/fb_hub && node launch_ngrok.js`
3. If still fails, consider alternatives:
   - Option A: Use official ngrok CLI binary instead of npm package
   - Option B: Find where ngrok stores state and manually delete it
   - Option C: Contact ngrok support about the beta package issue

## Files Modified
- `C:\_projects\p23_fb_hub\fb_hub\launch_ngrok.js` - Main script
- `C:\_projects\p23_fb_hub\fb_hub\ngrok_authtoken.txt` - Your token (gitignored)
- `C:\_projects\p23_fb_hub\fb_hub\ngrok_recovery_codes.txt` - Your codes (gitignored)
- `C:\_projects\p23_fb_hub\fb_hub\.gitignore` - Added ngrok files
- `C:\_projects\p23_fb_hub\fb_hub\package.json` - Added ngrok dependency

## Script Features (Ready to Use)
- `--port=XXXX` - Port to tunnel (default: 8999)
- `--region=XX` - Ngrok region (default: us)
- `--wait=SECONDS` - Max wait time (default: 30)
- `--json` - JSON output only
- `--help` - Show help
- Reads authtoken from ngrok_authtoken.txt automatically
- Disconnects old tunnels before creating new one
- Health check on established tunnel

## Current Branch
`feature/reverse-proxy` in all three repos (fb_hub, wordguess, shared_components)

## Test Command After Reboot
```bash
cd /c/_projects/p23_fb_hub/fb_hub
node launch_ngrok.js
```

Expected output if working:
```
✅ Ngrok tunnel established!
   Public URL: https://XXXX.ngrok.io
   Protocol: HTTPS
   Management: http://127.0.0.1:4040
```
