/**
 * Layanan untuk mengatur interaksi dengan Google Drive.
 * Kita gunakan REST API langsung agar mudah diintegrasikan dengan React Vite.
 */

/**
 * Upload file ke Google Drive (Multipart)
 */
export const uploadFileToDrive = async (accessToken: string, file: Blob, filename: string, folderId?: string) => {
  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
    parents: folderId ? [folderId] : []
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  let res;
  try {
    res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form
    });
  } catch (err) {
    throw new Error('Jaringan terputus saat upload ke Google Drive.');
  }
  if (!res.ok) {
     if (res.status === 401 || res.status === 403) {
         window.dispatchEvent(new Event('auth-expired'));
         throw new Error('Sesi habis, silakan login ulang.');
     }
     throw new Error(`Upload gagal HTTP ${res.status}`);
  }
  return await res.json();
};

/**
 * Fetch daftar file dari Drive (Manager)
 */
export const fetchDriveFiles = async (accessToken: string, folderId?: string) => {
  let query = "trashed=false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webContentLink)`;
  
  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch (err) {
    throw new Error('Jaringan terputus saat fetch file dari Google Drive.');
  }
  if (!res.ok) {
     if (res.status === 401 || res.status === 403) {
         window.dispatchEvent(new Event('auth-expired'));
         throw new Error('Sesi habis, silakan login ulang.');
     }
     throw new Error(`Fetch gagal HTTP ${res.status}`);
  }
  return await res.json();
};

export async function getDriveStorageStats(token: string) {
  try {
    let res;
    try {
      res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (netErr: any) {
      throw new Error('Jaringan terputus atau gagal terhubung ke Google Drive.');
    }
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            window.dispatchEvent(new Event('auth-expired'));
            throw new Error('Sesi habis, silakan login ulang.');
        }
        throw new Error('Drive API Error HTTP ' + res.status);
    }
    const data = await res.json();
    return data.storageQuota;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function getFolderSizeStats(token: string, folderId: string) {
  try {
    const query = `'${folderId}' in parents and trashed=false`;
    let allFiles: any[] = [];
    let pageToken = '';
    do {
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,mimeType,size)&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
      
      let res;
      try {
        res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      } catch (netErr: any) {
        break;
      }

      if (!res.ok) {
         if (res.status === 401 || res.status === 403) {
            window.dispatchEvent(new Event('auth-expired'));
         }
         break;
      }
      const data = await res.json();
      allFiles = allFiles.concat(data.files || []);
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    let pngJpeg = 0;
    let video = 0;
    let pdfDoc = 0;
    let other = 0;
    
    allFiles.forEach(f => {
      const size = parseInt(f.size || '0', 10);
      if (f.mimeType === 'image/png' || f.mimeType === 'image/jpeg') pngJpeg += size;
      else if (f.mimeType.startsWith('video/')) video += size;
      else if (f.mimeType === 'application/pdf' || f.mimeType.includes('document')) pdfDoc += size;
      else if (f.mimeType !== 'application/vnd.google-apps.folder') other += size;
    });

    const total = pngJpeg + video + pdfDoc + other;
    return { pngJpeg, video, pdfDoc, other, total };
  } catch(e) {
    console.error(e);
    return null;
  }
}

export async function ensureDityStoreFolder(token: string) {
  return '1NCfbHjZWaR-J_8IiDowA2gq4JevG-KMe';
}
