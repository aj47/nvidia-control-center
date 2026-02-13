import * as fs from "fs"
import * as path from "path"

const cacheDirs = [
  path.join(process.cwd(), "node_modules", ".vite"),
  path.join(process.cwd(), "node_modules", ".vite-electron"),
]

for (const dir of cacheDirs) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
      console.log(`[clear-vite-cache] removed ${path.relative(process.cwd(), dir)}`)
    }
  } catch (error) {
    console.warn(
      `[clear-vite-cache] failed to remove ${path.relative(process.cwd(), dir)}:`,
      error,
    )
  }
}
