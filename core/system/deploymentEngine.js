import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REGISTRY_PATH = path.join(__dirname, '../../data/deployments.json');

// Initialize registry if it doesn't exist
function initRegistry() {
    if (!fs.existsSync(path.dirname(REGISTRY_PATH))) {
        fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
    }
    if (!fs.existsSync(REGISTRY_PATH)) {
        fs.writeFileSync(REGISTRY_PATH, JSON.stringify({ domains: {}, projects: {} }, null, 2));
    }
}

export function getDeployments() {
    initRegistry();
    try {
        const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
        return JSON.parse(data);
    } catch {
        return { domains: {}, projects: {} };
    }
}

export function saveDeployments(data) {
    initRegistry();
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2));
}

export function registerDeployment(project_id, domain) {
    const data = getDeployments();
    
    const targetDir = path.join(__dirname, '../../data/deployments', project_id, 'public');
    
    // Ensure deployment target directory exists (for static files)
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, 'index.html'), `<h1>Daxini Space: ${project_id}</h1><p>Deployment successful. Ready for files.</p>`);
    }

    if (!data.projects[project_id]) {
        data.projects[project_id] = { created_at: new Date().toISOString(), path: targetDir };
    }
    
    if (domain) {
        data.domains[domain] = { project_id, path: targetDir, active: true };
    }

    saveDeployments(data);
    return { success: true, project_id, targetDir, domain };
}

export function resolveDomain(host) {
    // Exact match
    const data = getDeployments();
    if (data.domains[host] && data.domains[host].active) {
        return data.domains[host].path;
    }
    return null;
}
