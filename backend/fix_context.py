import os

file_path = r"C:\Users\USER\Desktop\Provost\Python health\Telemedicine-platform\backend\venv\Lib\site-packages\django\template\context.py"

# Backup
with open(file_path, 'r') as f:
    content = f.read()

with open(file_path + '.bak', 'w') as f:
    f.write(content)

# Fix the __copy__ method
old_code = """    def __copy__(self):
        duplicate = super().__copy__()
        duplicate.dicts = self.dicts[:]
        duplicate._current = self._current
        return duplicate"""

new_code = """    def __copy__(self):
        try:
            duplicate = super().__copy__()
        except AttributeError:
            from django.template.context import Context
            duplicate = Context(self.dicts, autoescape=self.autoescape)
        duplicate.dicts = self.dicts[:]
        duplicate._current = self._current
        return duplicate"""

content = content.replace(old_code, new_code)

with open(file_path, 'w') as f:
    f.write(content)

print("✅ File patched successfully!")