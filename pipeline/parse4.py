import re, json
from common import *
raw=open('/home/claude/txt/4.txt',encoding='utf8',errors='ignore').read()
titles={1:'Perioperative Evaluation and Management',2:'Airway Management',3:'Anesthesia Machine',4:'Patient Monitoring',5:'Fluid Management and Blood Transfusion',6:'Anesthetic Pharmacology',7:'Spinal and Epidural Anesthesia',8:'Peripheral Nerve Blocks',9:'Pain Management',10:'Orthopedic Anesthesia',11:'Cardiovascular Anesthesia',12:'Thoracic Anesthesia',13:'Neuroanesthesia',14:'Gastrointestinal, Liver, and Renal Diseases',15:'Endocrine Diseases',16:'Ophthalmic, Ear, Nose, and Throat Surgery',17:'Obstetric Anesthesia',18:'Pediatric Anesthesia',19:'Critical Care',20:'Postoperative Anesthesia Care',21:'Miscellaneous Topics'}
heads=[(m.start(),int(m.group(1)),m.end()) for m in re.finditer(r'CHAPTER\s+(\d+)\s+ANSWERS',raw)]
start0=raw.index('Preet Singh, Manish Purohit')
qseg={}; aseg={}
qseg[1]=raw[start0:heads[0][0]]
for i,(pos,n,end) in enumerate(heads):
    nxt=heads[i+1][0] if i+1<len(heads) else len(raw)
    seg=raw[end:nxt]
    if n<21:
        m=re.search(r'(?m)^[ \t]*1\.[ \t]+(?![ \t]*[A-E]\.)',seg)
        cut=m.start()
        aseg[n]=seg[:cut]; qseg[n+1]=seg[cut:]
    else: aseg[n]=seg
noise=re.compile(r'^\s*(\d{1,3}|CHAPTER.*|Chapter.*)\s*$')
def parse_questions(seg,ch):
    seg=seg.replace('\f','\n')
    L=[l for l in seg.split('\n') if not noise.match(l) or re.match(r'^\s*\d+\.',l)]
    qs=[];cur=None;exp=1
    for l in L:
        m=re.match(r'^\s*(\d{1,3})\.\s+(\S.*)$',l)
        if m and int(m.group(1))==exp and not re.match(r'[A-E]\.\s',m.group(2)):
            cur={'num':exp,'lines':[m.group(2)]};qs.append(cur);exp+=1
        elif cur is not None: cur['lines'].append(l)
    out=[]
    for q in qs:
        txt='\n'.join(q['lines'])
        om=list(re.finditer(r'(?m)^\s*([A-E])\.\s+',('\n'+txt) if False else txt))
        # first line may start the stem; options are lines starting with letter.
        # ensure sequential letters
        seq=[];nextl='A'
        for mm in om:
            if mm.group(1)==nextl: seq.append(mm);nextl=chr(ord(nextl)+1)
        if not seq: out.append({'num':q['num'],'stem':join_lines(q['lines']),'opts':{}});continue
        stem=join_lines(txt[:seq[0].start()].split('\n'))
        opts={}
        for j,mm in enumerate(seq):
            end=seq[j+1].start() if j+1<len(seq) else len(txt)
            opts[mm.group(1)]=join_lines(txt[mm.end():end].split('\n'))
        out.append({'num':q['num'],'stem':stem,'opts':opts})
    return out
def parse_answers(seg):
    seg=seg.replace('\f','\n')
    L=[l for l in seg.split('\n') if not re.match(r'^\s*\d{1,3}\s*$',l)]
    res={};cur=None;exp=1
    for l in L:
        m=re.match(r'^\s*(\d{1,3})\.\s+([A-E](?:\s*(?:,|and|&)\s*[A-E])*)\.(?:\s+(.*))?\s*$',l)
        if m and int(m.group(1))==exp:
            cur={'letter':m.group(2),'lines':[m.group(3) or '']};res[exp]=cur;exp+=1
        elif cur is not None: cur['lines'].append(l)
    return {k:(v['letter'],join_lines(v['lines'])) for k,v in res.items()}
out=[];problems=[]
for ch in range(1,22):
    qs=parse_questions(qseg[ch],ch); ans=parse_answers(aseg[ch])
    nq=len(qs);na=len(ans)
    if nq!=na: problems.append((ch,nq,na))
    for q in qs:
        a=ans.get(q['num'])
        flags=[]
        if len(q['opts'])<2: flags.append('options_not_parsed')
        elif len(q['opts'])<4: flags.append('fewer_than_4_options')
        letter=None;expl=None
        if a: letter,expl=a
        else: flags.append('no_answer')
        if letter and letter not in q['opts']: flags.append('answer_not_in_options')
        out.append({'source':"Lippincott's Anesthesia Review 1001",'src_file':4,'src_num':f"{ch}.{q['num']}",'chapter':titles[ch],'question':q['stem'],'options':q['opts'],'answer':letter,'explanation':expl,'flags':flags})
json.dump(out,open('raw4.json','w'),indent=1,ensure_ascii=False)
print('total',len(out),'count mismatches (ch,q,a):',problems)
from collections import Counter
print(Counter(f for o in out for f in o['flags']))
print(Counter(len(o['options']) for o in out))
for o in out[:1]+out[500:501]: print(json.dumps(o,ensure_ascii=False,indent=1)[:900])
