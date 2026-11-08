import re, json
def clean(s):
    s = s.replace('\u00ad','').replace('\x07','').replace('\f',' ')
    s = re.sub(r'[ \t]+',' ',s)
    return s.strip()
def join_lines(lines):
    out=[]
    for l in lines:
        l=l.strip()
        if not l: continue
        out.append(l)
    t=' '.join(out)
    t=re.sub(r'(\w)- (\w)',lambda m:m.group(0),t)
    return clean(t)
