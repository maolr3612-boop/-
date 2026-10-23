"""Estimate a textured silhouette-loft mesh from the supplied synthetic turntable.
This is a real closed surface, not a billboard or a frame switching animation.
Requires numpy, scipy, scikit-image and Pillow. No third-party source is copied.
"""
import json, struct
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.measure import marching_cubes

root=Path(__file__).resolve().parent.parent
sheet_path=root/'web/assets/maolongrui-turntable-v2.png'
master_path=root/'web/assets/maolongrui-3d-master.png'
sheet=np.asarray(Image.open(sheet_path).convert('RGBA'))
master=np.asarray(Image.open(master_path).convert('RGBA'))
MH,MW=master.shape[:2]
my,mx=np.where(master[:,:,3]>250);master_bounds=(int(mx.min()),int(mx.max()),int(my.min()),int(my.max()))
H,W=sheet.shape[:2]; boxes=[]
for row in range(2):
    y0=round(row*H/2);y1=round((row+1)*H/2)
    mask=sheet[y0:y1,:,3]>100
    labels,n=ndi.label(mask.sum(axis=0)>3)
    runs=[]
    for k in range(1,n+1):
        xs=np.where(labels==k)[0]
        if len(xs)>35:runs.append((int(xs[0]),int(xs[-1])))
    assert len(runs)==4, runs
    for x0,x1 in runs:
        yy,xx=np.where(mask[:,x0:x1+1]);boxes.append((x0,x1,y0+int(yy.min()),y0+int(yy.max())))

height=1.8
xs=np.linspace(-.45,.45,176,dtype=np.float32)
ys=np.linspace(-.025,1.825,370,dtype=np.float32)
zs=np.linspace(-.32,.32,140,dtype=np.float32)
vote=np.zeros((len(xs),len(ys),len(zs)),dtype=np.uint8)
X=xs[:,None];Z=zs[None,:]
for i,(x0,x1,y0,y1) in enumerate(boxes):
    theta=i*np.pi/4;scale=(y1-y0)/height
    px=np.rint((x0+x1)/2+(X*np.cos(theta)-Z*np.sin(theta))*scale).astype(int)
    py=np.rint(y1-ys*scale).astype(int)
    validx=(px>=0)&(px<W);validy=(py>=y0)&(py<=y1)
    observed=sheet[np.clip(py,0,H-1)[None,:,None],np.clip(px,0,W-1)[:,None,:],3]>100
    if i==0:
        a,b,c,d=master_bounds;mscale=(d-c)/height
        mpx=np.rint((a+b)/2+X*mscale).astype(int)
        mpy=np.rint(d-ys*mscale).astype(int)
        front_observed=(master[np.clip(mpy,0,MH-1)[None,:,None],np.clip(mpx,0,MW-1)[:,None,:],3]>250)&((mpy>=c)&(mpy<=d))[None,:,None]
    if i==2:side_observed=observed&validx[:,None,:]&validy[None,:,None]
    vote+=(observed&validx[:,None,:]&validy[None,:,None]).astype(np.uint8)
# Rounded cross-section loft constrained by front and side silhouettes.
# This avoids treating inconsistent synthetic camera views as calibrated scans.
solid=np.zeros_like(vote,dtype=bool)
zc_by_y=np.zeros(len(ys));zr_by_y=np.zeros(len(ys))
for j in range(len(ys)):
    side=np.where(side_observed[0,j,:])[0]
    if not len(side):continue
    zc_by_y[j]=(zs[side[0]]+zs[side[-1]])/2
    zr_by_y[j]=max((zs[side[-1]]-zs[side[0]])/2,.008)
zc_by_y=ndi.gaussian_filter1d(zc_by_y,1.3)
zr_by_y=ndi.gaussian_filter1d(zr_by_y,1.3)
for j in range(len(ys)):
    row=front_observed[:,j,0]
    groups,n=ndi.label(row)
    for g in range(1,n+1):
        xx=np.where(groups==g)[0]
        if len(xx)<3:continue
        cx=(xs[xx[0]]+xs[xx[-1]])/2
        rx=max((xs[xx[-1]]-xs[xx[0]])/2,.008)
        rz=zr_by_y[j]*min(1,np.sqrt(rx/.10))
        if rz<.005:continue
        solid[:,j,:]|=((X-cx)/rx)**2+((Z-zc_by_y[j])/rz)**2<=1
solid[[0,-1],:,:]=False;solid[:,[0,-1],:]=False;solid[:,:,[0,-1]]=False
field=ndi.gaussian_filter(solid.astype(np.float32),.8)
spacing=(float(xs[1]-xs[0]),float(ys[1]-ys[0]),float(zs[1]-zs[0]))
vertices,faces,_,_=marching_cubes(field,.45,spacing=spacing,step_size=2)
vertices+=np.array([xs[0],ys[0],zs[0]])
centers=vertices[faces].mean(axis=1)
face_norm=np.cross(vertices[faces[:,1]]-vertices[faces[:,0]],vertices[faces[:,2]]-vertices[faces[:,0]])
if np.sum(face_norm*(centers-np.array([0,.9,0])))<0:
    faces=faces[:,[0,2,1]];face_norm=-face_norm
normals=np.zeros_like(vertices)
for k in range(3):np.add.at(normals,faces[:,k],face_norm)
normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-9)
fn=normals[faces].mean(axis=1)
angles=np.arange(8)*np.pi/4
directions=np.stack([np.sin(angles),np.zeros(8),np.cos(angles)],axis=1)
centerz=np.interp(centers[:,1],ys,zc_by_y)
views=np.argmax(fn@directions.T,axis=1)
# Keep one continuous high-resolution face/torso projection on the front half.
upper=centers[:,1]>.88
views[upper]=np.where(centers[upper,2]>=centerz[upper],0,4)

binary=bytearray();buffer_views=[];accessors=[]
def blob(data,target=None):
    while len(binary)%4:binary.append(0)
    off=len(binary);binary.extend(data);view={'buffer':0,'byteOffset':off,'byteLength':len(data)}
    if target:view['target']=target
    buffer_views.append(view);return len(buffer_views)-1
def attr(array,kind):
    array=np.asarray(array,dtype='<f4');view=blob(array.tobytes(),34962)
    accessors.append({'bufferView':view,'componentType':5126,'count':len(array),'type':kind,'min':array.min(axis=0).tolist(),'max':array.max(axis=0).tolist()});return len(accessors)-1
primitives=[]
master=np.asarray(Image.open(master_path).convert('RGBA'));mh,mw=master.shape[:2]
my,mx=np.where(master[:,:,3]>250);mx0,mx1,my0,my1=int(mx.min()),int(mx.max()),int(my.min()),int(my.max())
for i in range(8):
    ids=faces[views==i].reshape(-1)
    if not len(ids):continue
    v=vertices[ids];normal=normals[ids];x0,x1,y0,y1=boxes[i];theta=i*np.pi/4
    u=((x0+x1)/2+(v[:,0]*np.cos(theta)-v[:,2]*np.sin(theta))*(y1-y0)/height)/W
    vv=(y1-v[:,1]*(y1-y0)/height)/H
    material=0
    if i==0:
        front_width=(boxes[0][1]-boxes[0][0])/(boxes[0][3]-boxes[0][2])*height
        u=((mx0+mx1)/2+v[:,0]*(my1-my0)/height)/mw
        vv=(my1-v[:,1]*(my1-my0)/height)/mh
        material=1
    uv=np.stack([u,vv],axis=1)
    primitives.append({'attributes':{'POSITION':attr(v,'VEC3'),'NORMAL':attr(normal,'VEC3'),'TEXCOORD_0':attr(uv,'VEC2')},'material':material,'mode':4})
images=[]
for path in (sheet_path,master_path):images.append({'bufferView':blob(path.read_bytes()),'mimeType':'image/png'})
materials=[{'name':n,'doubleSided':True,'pbrMetallicRoughness':{'baseColorTexture':{'index':i},'metallicFactor':0,'roughnessFactor':.86}} for i,n in enumerate(['Multi-view surface','High-resolution front identity'])]
doc={'asset':{'version':'2.0','generator':'Mao Longrui visual-hull reconstruction','extras':{'method':'silhouette-constrained estimated loft','estimated':True}},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'Mao Longrui — reconstructed full body','mesh':0}],'meshes':[{'primitives':primitives}],'materials':materials,'textures':[{'source':0,'sampler':0},{'source':1,'sampler':0}],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],'images':images,'bufferViews':buffer_views,'accessors':accessors,'buffers':[{'byteLength':len(binary)}]}
j=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();j+=b' '*((-len(j))%4);binary+=b'\0'*((-len(binary))%4)
output=root/'web/assets/maolongrui-model.glb'
output.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary)
report={'vertices':len(vertices),'triangles':len(faces),'bytes':output.stat().st_size,'bounds':[vertices.min(axis=0).tolist(),vertices.max(axis=0).tolist()],'closed_surface':True,'source_views':8,'method':'estimated silhouette loft with photographic texture'}
(root/'model-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report))







