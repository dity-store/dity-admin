/**
 * Layanan untuk interaksi CRUD ke Google Spreadsheet
 */

// Ganti SPREADSHEET_ID berikut dengan ID asli sheet Anda.
const SPREADSHEET_ID = "1nZmZYTXP16_Txy6KXGF_3OJRKdRZ8hldoGwMufz344k";

/**
 * Membaca data Form Responses.
 */
const cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getTableData = async (accessToken: string, tableName: string, forceRefresh = false) => {
  const cacheKey = `${tableName}_${accessToken}`;
  if (!forceRefresh && cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const range = `${tableName}!A1:Z`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  
  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch (err: any) {
    throw new Error('Jaringan terputus atau gagal terhubung ke server Google Sheets.');
  }
  
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
       window.dispatchEvent(new Event('auth-expired'));
       throw new Error('Sesi habis, silakan login ulang.');
    }
    const errorText = await res.text();
    throw new Error(`HTTP Error ${res.status}: ${errorText}`);
  }

  const data = await res.json();

  const values = (data.values || []).filter((row: any[]) => row.length > 0 && row.some(cell => cell.toString().trim() !== ''));
  
  if (values.length > 0 || !cache[cacheKey]) {
    cache[cacheKey] = { data: values, timestamp: Date.now() };
  }
  
  return values;
};

/**
 * Pre-fetches common tables in a single batchGet request to improve dashboard loading speed.
 */
export const prefetchAllTableData = async (accessToken: string, tables: string[]) => {
  if (!tables || tables.length === 0) return;
  
  const ranges = tables.map(t => `ranges=${encodeURIComponent(t + '!A1:Z')}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${ranges}`;
  
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch (err: any) {
    return; // Ignore network errors on prefetch, will fallback to individual requests
  }
  
  if (!res.ok) {
     if (res.status === 401 || res.status === 403) {
         window.dispatchEvent(new Event('auth-expired'));
     }
     return;
  }
  
  const data = await res.json();
  if (data.valueRanges) {
     data.valueRanges.forEach((rangeObj: any) => {
        // extract table name from range (e.g. "'Orders'!A1:Z" -> "Orders")
        let tableName = rangeObj.range.split('!')[0];
        if (tableName.startsWith("'") && tableName.endsWith("'")) tableName = tableName.slice(1, -1);
        
        const cacheKey = `${tableName}_${accessToken}`;
        const values = (rangeObj.values || []).filter((row: any[]) => row.length > 0 && row.some((cell: any) => cell.toString().trim() !== ''));
        
        cache[cacheKey] = { data: values, timestamp: Date.now() };
     });
  }
};

/**
 * Update Setting Cepat (Jam Operasional / URL Template).
 * Misal row 2 adalah Setting Jam Pagi, row 3 Jam Malam.
 */
export const updateStoreHours = async (accessToken: string, cellRange: string, newHours: string) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${cellRange}?valueInputOption=USER_ENTERED`;
  
  let res;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [[newHours]]
      })
    });
  } catch (err) {
    throw new Error('Jaringan terputus.');
  }
  if (!res.ok) {
     if (res.status === 401 || res.status === 403) {
         window.dispatchEvent(new Event('auth-expired'));
         throw new Error('Sesi habis, silakan login ulang.');
     }
     throw new Error('Gagal merubah data');
  }
  return await res.json();
};

export const appendTableRow = async (accessToken: string, tableName: string, values: any[]) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${tableName}!A1:Z:append?valueInputOption=USER_ENTERED`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] })
    });
  } catch (err) {
    throw new Error('Jaringan terputus.');
  }
  if (!res.ok) {
     if (res.status === 401 || res.status === 403) {
         window.dispatchEvent(new Event('auth-expired'));
         throw new Error('Sesi habis, silakan login ulang.');
     }
     throw new Error('Gagal menambah data');
  }
  return res.json();
};

export const updateTableRow = async (accessToken: string, tableName: string, rowIndex: number, values: any[]) => {
  // rowIndex > 0 (1-based for header). A2 is rowIndex=2
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${tableName}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  let res;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] })
    });
  } catch (err) {
    throw new Error('Jaringan terputus.');
  }
  if (!res.ok) {
     if (res.status === 401 || res.status === 403) {
         window.dispatchEvent(new Event('auth-expired'));
         throw new Error('Sesi habis, silakan login ulang.');
     }
     throw new Error('Gagal merubah data');
  }
  return res.json();
};

export const ensureTemplatesTable = async (accessToken: string) => {
  try {
    let metaRes;
    try {
      metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch (netErr: any) {
      return; // Ignore general fetch errors for ensure table
    }
    
    if (!metaRes.ok) {
        if (metaRes.status === 401 || metaRes.status === 403) {
            window.dispatchEvent(new Event('auth-expired'));
        }
        return;
    }
    const meta = await metaRes.json();
    const hasTemplates = meta.sheets.some((s: any) => s.properties.title === 'Templates');
    
    if (!hasTemplates) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: 'Templates' } } }] })
      });
    }

    // Always update header to ensure the new columns are present
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Templates!A1:E1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [["ID_TEMPLATE", "NAMA_TEMPLATE", "LINK_TEMPLATE", "LINK_INVOICE_DRAFT", "LINK_INVOICE_LUNAS"]] })
    });

    const hasStoreHours = meta.sheets.some((s: any) => s.properties.title === 'Store_Hours');
    
    if (!hasStoreHours) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: 'Store_Hours' } } }] })
      });
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Store_Hours!A1:C2?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [["IS_OPEN", "JADWAL_BUKA", "JADWAL_TUTUP"], ["TRUE", "08:00", "22:00"]] })
      });
    }
  } catch (err) {
    console.error("Failed to ensure Templates table:", err);
  }
};
