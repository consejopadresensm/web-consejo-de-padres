/**
 * sheets.js - Google Sheets data fetcher
 */

const SHEETS_ID = '1AxVIB1Kp8SK1Yvw356Pl3GjvzOIkq0g1kng_8YmnA2s';
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=`;

async function getSheetData(sheetName) {
    try {
        const response = await fetch(BASE_URL + encodeURIComponent(sheetName));
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error(`Error en ${sheetName}:`, error);
        return [];
    }
}

/**
 * Parsea una cadena de fecha de forma robusta y limpia
 */
function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    // Eliminar comillas, BOM y otros caracteres invisibles que envia Google Sheets
    const s = String(dateStr).replace(/["\u200B-\u200D\uFEFF]/g, '').trim();
    if (!s) return new Date(0);

    // Formato YYYY-MM-DD (ISO)
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const d = new Date(s + 'T12:00:00');
        return isNaN(d.getTime()) ? new Date(0) : d;
    }
    
    // Formato DD/MM/YYYY (Comun en Latinoamerica)
    const parts = s.split('/');
    if (parts.length === 3) {
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
        return isNaN(d.getTime()) ? new Date(0) : d;
    }
    
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date(0) : d;
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return [];
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
            if (header) {
                // Limpiar valores de forma agresiva
                row[header] = (values[index] || '').replace(/^"|"$/g, '').trim();
            }
        });
        data.push(row);
    }
    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && nextChar === '"') {
            // Comillas escapadas "" dentro de campo
            current += '"';
            i++; // Saltar siguiente comilla
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

async function getConfig(clave) {
    const data = await getSheetData('config');
    const row = data.find(item => item.clave === clave);
    return row ? row.valor : null;
}

async function getActividades(filtros = {}) {
    try {
        let data = await getSheetData('actividades');

        // Filtro visible opcional (solo si el campo existe)
        data = data.filter(item => {
            if (!item) return false;
            // Si no hay campo visible, no filtrar por esto
            if (item.visible === undefined || item.visible === '') return true;
            return (item.visible || '').toLowerCase() === 'si';
        });

        if (filtros.soloFuturas !== false) {
            const now = new Date();
            now.setHours(0,0,0,0);
            data = data.filter(item => parseDate(item.fecha).getTime() >= now.getTime());
        }

        if (filtros.destacado) {
            data = data.filter(item => (item.destacado || '').toLowerCase() === 'si');
        }

        if (filtros.estado) {
            data = data.filter(item => (item.estado || '').toLowerCase() === filtros.estado.toLowerCase());
        }

        return data.sort((a, b) => parseDate(a.fecha).getTime() - parseDate(b.fecha).getTime());
    } catch (error) {
        console.error('Error en getActividades:', error);
        return [];
    }
}

async function getComunicados(soloDestacados = false) {
    try {
        let data = await getSheetData('comunicados');
        data = data.filter(item => {
            if (item.visible === undefined) return true;
            return (item.visible || '').toLowerCase() === 'si';
        });
        if (soloDestacados) {
            data = data.filter(item => (item.destacado || '').toLowerCase() === 'si');
        }
        return data.sort((a, b) => parseDate(b.fecha).getTime() - parseDate(a.fecha).getTime());
    } catch (error) {
        console.error('Error en getComunicados:', error);
        return [];
    }
}

async function getCampanas() {
    let data = await getSheetData('campanas');
    return data.filter(item => {
        if (item.visible === undefined) return true;
        return (item.visible || '').toLowerCase() === 'si';
    }).sort((a, b) => parseInt(a.orden || 0) - parseInt(b.orden || 0));
}

async function getTemasManual(filtros = {}) {
    let data = await getSheetData('temas_manual');
    if (filtros.categoria) data = data.filter(item => item.categoria === filtros.categoria);
    return data.sort((a, b) => parseInt(a.orden || 0) - parseInt(b.orden || 0));
}

async function getBloquesManual(temaId) {
    let data = await getSheetData('bloques_manual');
    return data.filter(item => item.tema_id === temaId).sort((a, b) => parseInt(a.orden || 0) - parseInt(b.orden || 0));
}

async function getTemaBySlug(slug) {
    const data = await getSheetData('temas_manual');
    return data.find(item => item.slug === slug) || null;
}

async function getCampanaById(idCampana) {
    const data = await getSheetData('campanas');
    return data.find(item => {
        if (item.id !== idCampana) return false;
        if (item.visible === undefined) return true;
        return (item.visible || '').toLowerCase() === 'si';
    }) || null;
}

async function getVideosCampana(idCampana) {
    let data = await getSheetData('videos');
    return data.filter(item => item.campana === idCampana).sort((a, b) => parseInt(a.orden || 0) - parseInt(b.orden || 0));
}

async function getJuegosCampana(idCampana) {
    let data = await getSheetData('juegos');
    return data.filter(item => item.campana === idCampana).sort((a, b) => parseInt(a.orden || 0) - parseInt(b.orden || 0));
}

async function getRecursosCampana(idCampana) {
    let data = await getSheetData('recursos');
    return data.filter(item => item.categoria === idCampana).sort((a, b) => parseInt(a.orden || 0) - parseInt(b.orden || 0));
}

async function getRecursos(categoria = null) {
    let data = await getSheetData('recursos');
    if (categoria) {
        data = data.filter(item => item.categoria === categoria);
    }
    return data.sort((a, b) => parseInt(a.orden || 0) - parseInt(b.orden || 0));
}

async function getEnlaces(grupo = null) {
    let data = await getSheetData('enlaces');
    data = data.filter(item => {
        if (item.visible === undefined) return true;
        return (item.visible || '').toLowerCase() === 'si';
    });
    if (grupo) data = data.filter(item => (item.grupo || '').toLowerCase() === grupo.toLowerCase());
    return data.sort((a, b) => parseInt(a.orden || 0) - parseInt(b.orden || 0));
}

async function buscarIconoAutomatico(tema) {
    try {
        const palabraClave = encodeURIComponent(tema.split(' ')[0]); 
        const respuesta = await fetch(`https://api.iconify.design/search?query=${palabraClave}&limit=1`);
        const datos = await respuesta.json();
        
        if (datos && datos.icons && datos.icons.length > 0) {
            // Iconify devuelve el nombre completo (prefijo:icono), construimos la URL:
            const parts = datos.icons[0].split(':');
            if(parts.length === 2) {
                return `https://api.iconify.design/${parts[0]}/${parts[1]}.svg`;
            }
        }
        return '';
    } catch (error) {
        return '';
    }
}

async function getPropositos() {
    try {
        let data = await getSheetData('propositos');
        
        // Diccionario de seguridad por si el CSV exporta vacío el =IMAGE()
        const iconosFallback = {
            "Huella Digital": "https://cdn-icons-png.flaticon.com/512/977/977661.png",
            "Empatía Online": "https://cdn-icons-png.flaticon.com/512/19033/19033418.png",
            "Sueños a Futuro": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            "Filtro de Ayuda": "https://cdn-icons-png.flaticon.com/512/616/616490.png",
            "Talento Local": "https://cdn-icons-png.flaticon.com/512/2583/2583344.png",
            "Privacidad Total": "https://cdn-icons-png.flaticon.com/512/3064/3064197.png",
            "Resiliencia": "https://cdn-icons-png.flaticon.com/512/742/742751.png",
            "Desconexión": "https://cdn-icons-png.flaticon.com/512/483/483947.png",
            "Valores ENSM": "https://cdn-icons-png.flaticon.com/512/2436/2436874.png",
            "Mapa de Metas": "https://cdn-icons-png.flaticon.com/512/3022/3022256.png"
        };

        const filtrados = data.filter(item => item && (item['propósito (para la ruleta)'] || item['texto']));
        
        const promesas = filtrados.map(async item => {
            const tema = item['tema'] || '';
            let imgRaw = item['url figura'] || item['imagen'] || item['figura'] || '';
            
            // 1. Extraer URL de la hoja
            const imgMatch = imgRaw.match(/https?:\/\/[^"\')]+/);
            let imagenUrl = imgMatch ? imgMatch[0] : imgRaw;
            
            // 2. Usar diccionario de respaldo
            if (!imagenUrl && iconosFallback[tema]) {
                imagenUrl = iconosFallback[tema];
            }
            
            // 3. Buscar automáticamente en Iconify si no hay icono
            if (!imagenUrl && tema) {
                imagenUrl = await buscarIconoAutomatico(tema);
            }

            return {
                texto: item['propósito (para la ruleta)'] || item['texto'],
                tema: tema,
                reto: item['reto fotográfico (muro de evidencias)'] || item['reto'] || '',
                imagen: imagenUrl,
                visible: (item.visible || 'si').toLowerCase() === 'si'
            };
        });

        const resultados = await Promise.all(promesas);
        return resultados.filter(item => item.visible);

    } catch (error) {
        console.error('Error en getPropositos:', error);
        return [];
    }
}
