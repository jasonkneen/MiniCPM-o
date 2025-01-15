import express from 'express';
import cors from 'cors';
import https from 'https';
import { Buffer } from 'buffer';
import process from 'process';
import { execSync } from 'child_process';

const app = express();
const port = 8080;

// Kill any existing process on port 8080
console.log('Checking for existing processes on port 8080...');
try {
    execSync('lsof -ti:8080 | xargs kill -9', { stdio: 'ignore' });
    console.log('Killed existing process on port 8080');
} catch (error) {
    console.log('No existing process found on port 8080');
}

// Basic middleware
app.use(cors());
app.use(express.raw({ type: 'application/json' }));

// Logging middleware
app.use((req, res, next) => {
    console.log('\n=== Incoming Request ===');
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: err.message });
});

// Whitelist of headers to forward
const ALLOWED_HEADERS = [
    'authorization',
    'content-type',
    'content-length',
    'accept',
    'openai-organization',
    'user-agent'
];

// Main proxy handler
app.all('/v1/*', (req, res) => {
    const options = {
        hostname: 'api.openai.com',
        path: req.url,
        method: req.method,
        headers: {}
    };

    // Forward whitelisted headers
    ALLOWED_HEADERS.forEach(header => {
        if (req.headers[header]) {
            options.headers[header] = req.headers[header];
        }
    });

    // Ensure content-type is set for POST requests
    if (req.method === 'POST') {
        options.headers['content-type'] = 'application/json';
    }

    console.log('\n=== Forwarding Request ===');
    console.log('Target:', `https://${options.hostname}${options.path}`);
    console.log('Headers:', options.headers);

    const proxyReq = https.request(options, proxyRes => {
        // Forward response headers
        Object.keys(proxyRes.headers).forEach(header => {
            res.setHeader(header, proxyRes.headers[header]);
        });

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));

        // Set response status code
        res.status(proxyRes.statusCode);

        // Pipe the response directly to the client
        proxyRes.pipe(res);

        // Log response status
        console.log('\n=== Proxy Response ===');
        console.log('Status:', proxyRes.statusCode);
        console.log('Headers:', proxyRes.headers);
    });

    // Handle proxy request errors
    proxyReq.on('error', error => {
        console.error('\n=== Proxy Error ===');
        console.error('Error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to proxy request',
                details: error.message
            }
        });
    });

    // If there's a request body, write it to the proxy request
    if (req.method === 'POST' && req.body) {
        const bodyData = req.body instanceof Buffer ? req.body : JSON.stringify(req.body);
        console.log('Request Body:', bodyData.toString());
        proxyReq.write(bodyData);
    }

    // End the proxy request
    proxyReq.end();
});

// Handle preflight requests
app.options('/v1/*', cors());

let server;

// Start server with error handling
console.log('Starting proxy server...');
try {
    server = app
        .listen(port, () => {
            console.log(`Proxy server running at http://localhost:${port}`);
            console.log('Ready to handle requests');
        })
        .on('error', err => {
            console.error('Failed to start server:', err);
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${port} is already in use. Please try a different port.`);
            }
            process.exit(1);
        });

    // Test server is actually listening
    if (!server.listening) {
        throw new Error('Server failed to start listening');
    }

    // Add error event handler
    server.on('error', err => {
        console.error('Server error:', err);
    });
} catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
}

// Graceful shutdown
const shutdown = () => {
    console.log('\nShutting down gracefully...');
    if (server) {
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
