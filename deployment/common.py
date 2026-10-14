"""Shared helpers for the deployment scripts. No secret value is ever printed."""
import os
from pathlib import Path
import re
import subprocess
import tempfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
SERVICE = 'purrbrews-dashboard'
ENV_PATH = ROOT / '.env'


def compose(*args, **kwargs):
    """Run docker compose for this stack. Project name and compose.override.yaml
    come from compose.yaml and Compose's own defaults, not from this script."""
    return subprocess.run(['docker', 'compose', *args], cwd=ROOT, **kwargs)


def container_id():
    result = compose('ps', '-q', SERVICE, capture_output=True, text=True, check=True)
    ident = result.stdout.strip()
    if not ident:
        raise SystemExit('The dashboard container is not running. Start it with: docker compose up -d')
    return ident


def node_in_container(code, *args, **kwargs):
    """Run an ES module from stdin inside the running dashboard container."""
    return subprocess.run(['docker', 'exec', '-i', container_id(), 'node', '--input-type=module', '-', *args],
                          input=code, text=True, **kwargs)


def read_env(path=ENV_PATH):
    values = {}
    for line in path.read_text().splitlines():
        match = re.match(r'^([A-Z0-9_]+)=(.*)$', line)
        if match:
            values[match.group(1)] = match.group(2).strip().strip('"\'')
    return values


def _timestamp():
    return datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')


def write_private(path, text, mode=0o600, backup=True):
    """Atomically replace path, keeping a private timestamped backup of the old file."""
    if backup and path.exists():
        fd = os.open(path.with_name(path.name + '.backup-' + _timestamp()), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as handle:
            handle.write(path.read_text())
    fd, temporary = tempfile.mkstemp(prefix=path.name + '.tmp-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as handle:
            handle.write(text)
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def update_env(updates, path=ENV_PATH):
    """Set KEY=value lines in .env, refusing duplicates. Returns True if changed."""
    original = path.read_text()
    updated = original
    for setting, value in updates.items():
        pattern = r'^' + re.escape(setting) + r'=.*$'
        matches = list(re.finditer(pattern, updated, re.MULTILINE))
        if len(matches) > 1:
            raise SystemExit('Duplicate setting: ' + setting + '. Resolve it in .env first.')
        line = setting + '=' + value
        updated = re.sub(pattern, lambda _: line, updated, flags=re.MULTILINE) if matches else updated.rstrip('\n') + '\n' + line + '\n'
    if updated == original:
        return False
    write_private(path, updated)
    return True


def recreate():
    compose('up', '-d', '--force-recreate', SERVICE, check=True)
