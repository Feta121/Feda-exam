import pymupdf, re, json, warnings
warnings.filterwarnings('ignore')
from common import *
d=pymupdf.open("/home/claude/src/good quali/A Comprehensive Review 1001.pdf")
chapters=[ # title, q_start_page, ans_start_page, end_page (1-based, inclusive)
('Anesthesia Equipment and Physics',11,20,38),
('Respiratory Physiology and Critical Care Medicine',39,46,60),
('Pharmacology and Pharmacokinetics of Intravenous Drugs',61,72,99),
('Pharmacology and Pharmacokinetics of Volatile Anesthetics',100,106,116),
('Blood Products, Transfusion, and Fluid Therapy',117,121,127),
('General Anesthesia',128,141,164),
('Pediatric Physiology and Anesthesia',165,173,189),
('Obstetric Physiology and Anesthesia',190,198,217),
('Neurologic Physiology and Anesthesia',218,224,236),
('Anatomy, Regional Anesthesia, and Pain Management',237,247,267),
('Cardiovascular Physiology and Anesthesia',268,278,293)]
def page_lines(pn):
    p=d[pn-1]; H=p.rect.height
    bl=[b for b in p.get_text("blocks") if b[6]==0 and 45<b[1]<H-30]
    res=[]
    for grp in ([b for b in bl if b[0]<300],[b for b in bl if b[0]>=300]):
        for b in sorted(grp,key=lambda b:(round(b[1]),b[0])):
            res.append((pn,b[4]))
    return res
def seg_text(a,b):
    out=[]
    for pn in range(a,b+1):
        for _,t in page_lines(pn):
            out.append(t)
    t=''.join(out)
    t=t.replace('\x07','').replace('\u00ad\n','').replace('\u00ad','').replace('\u2002',' ').replace('\u2009','')
    t=re.sub(r'[\t\u00a0]+',' ',t)
    return t

ans_all={}; chunks={}; groups=[]
for ci,(title,qa,aa,ea) in enumerate(chapters):
    qt=seg_text(qa,aa-1); at=seg_text(aa,ea)
    cur=None
    for l in at.split('\n'):
        m=re.match(r'^\s*(\d{1,4})\.?\s*\(([A-E])\)\s*(.*)$',l)
        if m:
            cur={'n':int(m.group(1)),'letter':m.group(2),'lines':[m.group(3)]}
            ans_all.setdefault(cur['n'],[]).append(cur)
        elif cur is not None and not re.match(r'^\s*(CHAPTER|Part \d|\d+\s*$)',l): cur['lines'].append(l)
    nums=sorted(k for k,v in ans_all.items() if any(True for x in v) )
    an=[int(m.group(1)) for m in re.finditer(r'(?m)^\s*(\d{1,4})\.?\s*\([A-E]\)',at)]
    lo,hi=min(an),max(an)
    cq=None
    for l in qt.split('\n'):
        m=re.match(r'^\s*(\d{1,4})\.\s*(.*)$',l)
        if m and lo<=int(m.group(1))<=hi and int(m.group(1)) not in chunks and not (m.group(2)[:1].isascii() and m.group(2)[:1].islower()):
            n=int(m.group(1)); cq={'n':n,'lines':[m.group(2)],'chapter':title}; chunks[n]=cq
        elif cq is not None: cq['lines'].append(l)
def parse_opts(txt):
    om=list(re.finditer(r'(?m)^\s*([A-F])\.\s*',txt))
    seqs=[];cur=[];nl='A'
    for mm in om:
        if mm.group(1)==nl: cur.append(mm);nl=chr(ord(nl)+1)
        elif mm.group(1)=='A':
            if cur: seqs.append(cur)
            cur=[mm];nl='B'
    if cur: seqs.append(cur)
    res=[]
    for seq in seqs:
        stemend=seq[0].start()
        opts={}
        for j,mm in enumerate(seq):
            e=seq[j+1].start() if j+1<len(seq) else None
            opts[mm.group(1)]=(mm.end(),e)
        res.append((seq,opts))
    return res
parsed={}
extras={}
for n,c in chunks.items():
    txt='\n'.join(c['lines'])
    dm=re.search(r'DIRECTIONS \(Questions (\d+) through (\d+)\):?(.*?)(?=\n\s*\d{1,4}\.|\Z)',txt,re.S)
    directions=None
    if dm:
        groups.append((int(dm.group(1)),int(dm.group(2)),join_lines(dm.group(3).split('\n'))))
        txt=txt[:dm.start()]+txt[dm.end():]
    seqs=parse_opts(txt)
    if seqs:
        first=seqs[0][0][0].start()
        stem=join_lines(txt[:first].split('\n'))
        o=seqs[0][1]; ends=[v[1] for v in o.values()]
        # last option of first seq ends at the beginning of next seq if any
        nxt=seqs[1][0][0].start() if len(seqs)>1 else len(txt)
        opts={}
        keys=list(o.keys())
        for k in keys:
            st,e=o[k]; e=e if e is not None else nxt
            opts[k]=join_lines(txt[st:e].split('\n'))
        parsed[n]={'stem':stem,'opts':opts}
        for sq,so in seqs[1:]:
            ex={}
            for k,(st,e) in so.items():
                e=e if e is not None else len(txt)
                ex[k]=join_lines(txt[st:e].split('\n'))
            extras.setdefault(n,[]).append(ex)
    else:
        parsed[n]={'stem':join_lines(txt.split('\n')),'opts':{}}
alltxt='\n'.join('\n'.join(c['lines']) for c in chunks.values())
for m in re.finditer(r'Group (\d+)\s*[-\u2013]\s*(\d+)',alltxt): groups.append((int(m.group(1)),int(m.group(2)),''))
for m in re.finditer(r'Questions (\d+)\s*(?:[-\u2013]|through)\s*(\d+)',alltxt): groups.append((int(m.group(1)),int(m.group(2)),''))
group_of={}
groups.sort(key=lambda g:-(g[1]-g[0]))
# keep directions text: map any member to the nearest directions text
dir_text={}
for a,b,dt in groups:
    if dt:
        for k in range(a,b+1): dir_text[k]=dt
for a,b,dt in groups:
    for k in range(a,b+1): group_of[k]=(a,b,dir_text.get(k,dt))
used_extras=set();group_cache={}
out=[]
for n in range(1,1002):
    c=chunks.get(n); p=parsed.get(n)
    a=ans_all.get(n)
    flags=[]
    if not c:
        flags.append('question_text_not_located')
        out.append({'source':'A Comprehensive Review 1001','src_file':1,'src_num':n,'chapter':None,'question':'','options':{},'answer':a[0]['letter'] if a else None,'explanation':join_lines(a[0]['lines']) if a else None,'flags':flags}); continue
    stem,opts=p['stem'],dict(p['opts'])
    g=group_of.get(n)
    if g and len(opts)<2:
        a0,b0,dt=g
        cand=group_cache.get((a0,b0))
        for m in (range(b0,a0-1,-1) if cand is None else []):
            if m in parsed and len(parsed[m]['opts'])>=2: cand=parsed[m]['opts']; break
        if not cand:
            for m in (a0-1,a0-2):
                if m in extras and extras[m] and m not in used_extras: cand=extras[m][0]; used_extras.add(m); break
        if cand: group_cache[(a0,b0)]=cand
        grp_dir=dt
        if cand:
            opts={k:re.sub(r'\s*(?:Questions|Group) \d+\s*[-\u2013]\s*\d+:?.*$','',v) for k,v in cand.items()}; flags.append('matching_group_shared_options')
        else: flags.append('matching_options_missing_figure_or_unparsed')
    if len(opts)<2 and 'matching_options_missing_figure_or_unparsed' not in flags: flags.append('options_not_parsed')
    elif 2<=len(opts)<4: flags.append('fewer_than_4_options')
    letter=a[0]['letter'] if a else None
    if not a: flags.append('no_answer')
    elif opts and letter not in opts: flags.append('answer_not_in_options')
    if re.search(r'\b(above|shown|figure|graph|diagram|tracing|waveform|loop|curve|radiograph|picture|below)\b',stem,re.I): flags.append('maybe_figure')
    out.append({'source':'A Comprehensive Review 1001','src_file':1,'src_num':n,'chapter':c['chapter'],'question':(('[Matching] '+stem) if g and stem else stem),'group':({'range':[g[0],g[1]],'directions':g[2]} if g else None),'options':opts,'answer':letter,'explanation':join_lines(a[0]['lines']) if a else None,'flags':flags})
json.dump(out,open('raw1.json','w'),indent=1,ensure_ascii=False)
from collections import Counter
print(len(out),Counter(f for o in out for f in o['flags']))
print('groups',len(groups),groups[:3])
print(Counter(len(o['options']) for o in out))
