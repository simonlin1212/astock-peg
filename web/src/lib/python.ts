/**
 * Resolve the Python executable across platforms.
 *
 * Windows installs usually expose `python` (and the `py` launcher), not
 * `python3` — hardcoding `python3` makes every script call fail there with
 * "Command failed: python3 ..." (issue #3). Default to `python` on Windows
 * and `python3` elsewhere; allow an explicit override via the PYTHON_BIN env.
 */
export function getPythonBin(): string {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  return process.platform === "win32" ? "python" : "python3";
}
