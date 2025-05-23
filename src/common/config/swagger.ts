import swaggerJsdoc from 'swagger-jsdoc';
import config from './env';

// Swagger definition
const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'InvenEase API Documentation',
            version: '1.0.0',
            description: 'API documentation for InvenEase backend services',
            contact: {
                name: 'API Support',
                email: 'support@invenease.com'
            }
        },
        servers: [
            {
                url: `http://localhost:${config.server.port}`,
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [{
            bearerAuth: []
        }]
    },
    // Path to the API docs
    apis: ['./src/modules/**/*.routes.ts']
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions); 