import re, json
from common import *
raw=open('/home/claude/txt/3.txt',encoding='utf8',errors='ignore').read()
lines=raw.split('\n')
# drop footer/page-number lines
skip=re.compile(r'^\s*(\d{1,3}\s*|Ethiopian Health Professionals Licensing Examination Practice Test Booklet.*)$')
lines=[l for l in lines if not skip.match(l)]
# find start: first "1." question
text='\n'.join(lines)
blocks=re.split(r'(?m)^\s*(\d{1,3})\.\s+(?=[A-Z])',text)
# blocks: [pre, num, body, num, body...]
qs=[]
expected=1
for i in range(1,len(blocks),2):
    n=int(blocks[i]); body=blocks[i+1]
    if n!=expected: 
        # not a real question start (e.g. numbered line inside a question); merge
        if qs: qs[-1]['_raw']+= f"\n{n}. "+body
        continue
    expected+=1
    qs.append({'num':n,'_raw':body})
out=[]; issues=[]
for q in qs:
    body=q['_raw']
    m=re.search(r'ANSWER:\s*([A-E])',body)
    ans=m.group(1) if m else None
    stem_opts=body[:m.start()] if m else body
    om=list(re.finditer(r'(?m)^\s*([A-E])\.\s+',stem_opts))
    if not om: issues.append((q['num'],'no options')); continue
    stem=join_lines(stem_opts[:om[0].start()].split('\n'))
    opts={}
    for j,mm in enumerate(om):
        end=om[j+1].start() if j+1<len(om) else len(stem_opts)
        opts[mm.group(1)]=join_lines(stem_opts[mm.end():end].split('\n'))
    flag=[]
    if len(opts)<4: flag.append('fewer_than_4_options')
    if not ans: flag.append('no_answer')
    elif ans not in opts: flag.append('answer_not_in_options')
    out.append({'source':'EHPLE Practice Test 2025','src_file':3,'src_num':q['num'],'question':stem,'options':opts,'answer':ans,'explanation':None,'flags':flag})
json.dump(out,open('raw3.json','w'),indent=1,ensure_ascii=False)
print(len(out),'questions; issues:',issues)
from collections import Counter
print(Counter(len(o['options']) for o in out), Counter(f for o in out for f in o['flags']))
print(json.dumps(out[12],indent=1,ensure_ascii=False)[:900])
print([o['src_num'] for o in out][:5],[o['src_num'] for o in out][-3:])
