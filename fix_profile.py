import pathlib
p = pathlib.Path(r"c:\Users\maxim\Pulse\app\profile\[userId].tsx")
text = p.read_text(encoding="utf-8")
start = text.index("        <View className=\"mt-4\">\n          <Pressable")
end = text.index("        <PublicProfileGallery")
new_text = text[:start] + text[end:]
p.write_text(new_text, encoding="utf-8")
print("Fixed")
