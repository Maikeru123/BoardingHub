// tsx uses os.userInfo() only to name its temporary directory. Some constrained
// Windows environments can report ENOMEM for that lookup even when Node itself
// has enough memory. Preserve the native result whenever it works and provide a
// non-sensitive fallback only for that platform error.
import os from "node:os"

const nativeUserInfo = os.userInfo
os.userInfo = (...args) => {
  try {
    return nativeUserInfo(...args)
  } catch (error) {
    if (error?.code !== "ERR_SYSTEM_ERROR") throw error
    return {
      uid: -1,
      gid: -1,
      username: process.env.USERNAME || "windows-user",
      homedir: process.env.USERPROFILE || os.tmpdir(),
      shell: null,
    }
  }
}
