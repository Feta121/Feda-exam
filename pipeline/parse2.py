import re, json
from common import *
raw=open('/home/claude/txt/2.txt',encoding='utf8',errors='ignore').read().replace('\f','\n')
noise=[r'^\s*Copyright.*',r'.*Reproduction of this Copyrighted Material.*',r'.*Anesthesiologists\. All rights Reserved.*',r'^\s*\d{1,3}\s*\|\s*P\s*a\s*g\s*e\s*$',r'^\s*\d{1,3}\s*$',r'^\s*Page \d+.*$']
lines=[l for l in raw.split('\n') if not any(re.match(p,l) for p in noise)]
start=next(i for i,l in enumerate(lines) if re.match(r'^\s*1\s*[\.\)]',l))
lines=lines[start:]
items=[];cur=None;exp=1;gaps=[]
for l in lines:
    m=re.match(r'^\s*(\d{1,3})\s*[\.\)]+\s*(\S.*)$',l)
    if m and exp<=int(m.group(1))<=exp+12 and not re.match(r'^\(?[A-Ea-e][\.\)]\s',m.group(2)):
        n=int(m.group(1))
        if n>exp: gaps.append(exp)
        cur={'n':n,'lines':[m.group(2)]};items.append(cur);exp=n+1
    elif cur is not None: cur['lines'].append(l)
print('markers found',len(items),'last',items[-1]['n'],'gaps',gaps)
def split_opts(txt):
    cands=[(m.start(),m.end(),m.group(1).upper()) for m in re.finditer(r'(?:(?<=\s)|(?<=^))\(?([A-Ea-e])\s*[\.\)]\s*(?=\S)',txt)]
    best=None
    for i,(s,e,L) in enumerate(cands):
        if L!='A': continue
        seq=[(s,e,'A')];prev='A'
        rest=cands[i+1:]
        for k,(s2,e2,L2) in enumerate(rest):
            if s2<=seq[-1][1]: continue
            nxt=chr(ord(prev)+1)
            if L2==nxt: seq.append((s2,e2,L2));prev=L2
            elif ord(L2)==ord(prev)+2 and not any(c[2]==nxt for c in rest[k+1:]):
                seq.append((s2,e2,L2));prev=L2
        if len(seq)>=3: best=seq
    return best
out=[]
for it in items:
    txt='\n'.join(it['lines'])
    seq=split_opts(txt)
    flags=[]
    if not seq:
        out.append({'source':'Arba Minch University Mock Exams 2025','src_file':2,'src_num':it['n'],'question':join_lines(txt.split('\n')),'options':{},'answer':None,'explanation':None,'flags':['options_not_parsed']});continue
    stem=join_lines(txt[:seq[0][0]].split('\n'))
    opts={}
    for j,(s,e,L) in enumerate(seq):
        end=seq[j+1][0] if j+1<len(seq) else len(txt)
        opts[L]=join_lines(txt[e:end].split('\n'))
    letters=''.join(opts.keys())
    if letters not in ('ABCD','ABCDE'): flags.append('option_letters_irregular:'+letters)
    elif len(opts)<4: flags.append('fewer_than_4_options')
    if len(stem)<15: flags.append('short_stem')
    if any(len(v)==0 for v in opts.values()): flags.append('empty_option')
    if re.search(r'\b(figure|shown|graph|diagram|tracing|picture|image|below|above)\b',stem,re.I): flags.append('maybe_figure')
    out.append({'source':'Arba Minch University Mock Exams 2025','src_file':2,'src_num':it['n'],'question':stem,'options':opts,'answer':None,'explanation':None,'flags':flags})
json.dump(out,open('raw2.json','w'),indent=1,ensure_ascii=False)
from collections import Counter
print(len(out),Counter(f for o in out for f in o['flags']),Counter(len(o['options']) for o in out))
