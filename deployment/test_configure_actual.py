"""Isolated checks: no Docker, credentials, or network connections are used."""
import contextlib
import io
import os
from pathlib import Path
import runpy
import shutil
import tempfile
import unittest
from unittest.mock import patch

class ConfigureActualTests(unittest.TestCase):
    def setUp(self):
        self.previous_cwd = Path.cwd()
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'deployment').mkdir()
        self.script = self.root / 'deployment/configure-actual.py'
        shutil.copyfile(Path(__file__).with_name('configure-actual.py'), self.script)
        self.original = 'APP_ENCRYPTION_KEY=fixture-existing-key\nACTUAL_SERVER_URL=\nACTUAL_SYNC_ID=\nACTUAL_SESSION_TOKEN=\nACTUAL_PASSWORD=old-password\nACTUAL_ENCRYPTION_PASSWORD=\nBUDGET_CURRENCY=INR\n'
        (self.root / '.env').write_text(self.original)

    def tearDown(self):
        os.chdir(self.previous_cwd)
        self.temp.cleanup()

    def run_helper(self, token='fixture-token', sync='fixture-sync', encryption='', tty=True):
        output = io.StringIO()
        with patch('sys.stdin.isatty', return_value=tty), patch('builtins.input', side_effect=[sync, 'INR']), patch('getpass.getpass', side_effect=[token, encryption]), patch('subprocess.run') as runner, contextlib.redirect_stdout(output):
            runpy.run_path(str(self.script), run_name='__main__')
        return output.getvalue(), runner

    def test_settings_private_backup_and_no_secret_output(self):
        output, runner = self.run_helper()
        text = (self.root / '.env').read_text()
        self.assertIn('APP_ENCRYPTION_KEY=fixture-existing-key', text)
        self.assertIn('ACTUAL_SERVER_URL=http://actualbudget:5006', text)
        self.assertIn("ACTUAL_SESSION_TOKEN='fixture-token'", text)
        self.assertIn('ACTUAL_PASSWORD=\n', text)
        self.assertNotIn('fixture-token', output)
        self.assertEqual(next(self.root.glob('.env.backup-*')).read_text(), self.original)
        if os.name != 'nt':
            self.assertEqual((self.root / '.env').stat().st_mode & 0o777, 0o600)
        self.assertIn('--force-recreate', runner.call_args.args[0])

    def test_preserves_custom_backend(self):
        (self.root / '.env').write_text(self.original.replace('ACTUAL_SERVER_URL=\n', 'ACTUAL_SERVER_URL=http://custom.invalid:5006\n'))
        self.run_helper()
        self.assertIn('ACTUAL_SERVER_URL=http://custom.invalid:5006', (self.root / '.env').read_text())

    def test_rejects_noninteractive_input(self):
        with self.assertRaises(SystemExit):
            self.run_helper(tty=False)
        self.assertEqual((self.root / '.env').read_text(), self.original)

    def test_rejects_invalid_token(self):
        with self.assertRaises(SystemExit):
            self.run_helper(token='line1\nline2')
        self.assertEqual((self.root / '.env').read_text(), self.original)

    def test_rejects_duplicate_setting(self):
        text = self.original + 'ACTUAL_SYNC_ID=duplicate\n'
        (self.root / '.env').write_text(text)
        with self.assertRaises(SystemExit):
            self.run_helper()
        self.assertEqual((self.root / '.env').read_text(), text)

    def test_password_characters_are_preserved(self):
        self.run_helper(encryption='fixture $cash #hash \\slash')
        self.assertIn("ACTUAL_ENCRYPTION_PASSWORD='fixture $cash #hash \\slash'", (self.root / '.env').read_text())

if __name__ == '__main__':
    unittest.main()
