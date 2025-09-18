import { Client, Databases, Storage, Permission, Role, ID } from 'node-appwrite';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { projectId, apiKey, action } = req.body || {};

    if (!projectId || !apiKey) {
      return res.status(400).json({ message: 'Project ID e API Key são obrigatórios' });
    }

    // Endpoint fixo (não muda)
    const endpoint = 'https://fra.cloud.appwrite.io/v1';

    // Configurar cliente Appwrite (Server SDK)
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);
    const storage = new Storage(client);

    // IDs padronizados
    const databaseId = 'video_site_db';
    const videoCollectionId = 'videos';
    const userCollectionId = 'users';
    const siteConfigCollectionId = 'site_config';
    const sessionCollectionId = 'sessions';
    const videosBucketId = 'videos_bucket';
    const thumbnailsBucketId = 'thumbnails_bucket';

    switch (action) {
      case 'test-connection': {
        try {
          await databases.list();
          return res.json({ success: true, message: 'Conexão estabelecida com sucesso' });
        } catch (err) {
          return res.status(400).json({ success: false, message: 'Falha na conexão: verifique Project ID e API Key' });
        }
      }

      case 'create-database': {
        try {
          await databases.create(databaseId, 'Video Site Database');
          return res.json({ success: true, message: 'Database criada com sucesso' });
        } catch (err) {
          if (String(err?.message || '').includes('already exists')) {
            return res.json({ success: true, message: 'Database já existe' });
          }
          throw err;
        }
      }

      case 'create-collection': {
        const { collectionId, collectionName, collectionType } = req.body || {};
        if (!collectionId || !collectionName || !collectionType) {
          return res.status(400).json({ message: 'Parâmetros de coleção inválidos' });
        }

        try {
          await databases.createCollection(
            databaseId,
            collectionId,
            collectionName,
            [
              Permission.read(Role.any()),
              Permission.create(Role.users()),
              Permission.write(Role.users()),
              Permission.update(Role.users()),
              Permission.delete(Role.users()),
            ],
          );

          // Pequenos delays para consistência do Appwrite
          await new Promise(r => setTimeout(r, 800));

          for (const attr of getAttributesForType(collectionType)) {
            try {
              await createAttribute(databases, databaseId, collectionId, attr);
              await new Promise(r => setTimeout(r, 250));
            } catch (attrErr) {
              if (!String(attrErr?.message || '').includes('already exists')) {
                console.warn(`Erro atributo ${attr.key}:`, attrErr);
              }
            }
          }

          await new Promise(r => setTimeout(r, 800));

          for (const idx of getIndexesForType(collectionType)) {
            try {
              await databases.createIndex(databaseId, collectionId, idx.key, idx.type, idx.attributes);
              await new Promise(r => setTimeout(r, 250));
            } catch (idxErr) {
              if (!String(idxErr?.message || '').includes('already exists')) {
                console.warn(`Erro índice ${idx.key}:`, idxErr);
              }
            }
          }

          return res.json({ success: true, message: `Collection '${collectionName}' criada/configurada` });
        } catch (err) {
          if (String(err?.message || '').includes('already exists')) {
            return res.json({ success: true, message: `Collection '${collectionName}' já existe` });
          }
          throw err;
        }
      }

      case 'create-bucket': {
        const { bucketId, bucketName } = req.body || {};
        if (!bucketId || !bucketName) {
          return res.status(400).json({ message: 'Parâmetros de bucket inválidos' });
        }
        try {
          await storage.createBucket(
            bucketId,
            bucketName,
            [
              Permission.read(Role.any()),
              Permission.create(Role.users()),
              Permission.write(Role.users()),
              Permission.update(Role.users()),
              Permission.delete(Role.users()),
            ],
          );
          return res.json({ success: true, message: `Bucket '${bucketName}' criado` });
        } catch (err) {
          if (String(err?.message || '').includes('already exists')) {
            return res.json({ success: true, message: `Bucket '${bucketName}' já existe` });
          }
          throw err;
        }
      }

      case 'create-initial-data': {
        try {
          const list = await databases.listDocuments(databaseId, siteConfigCollectionId);
          if (list.total === 0) {
            await databases.createDocument(databaseId, siteConfigCollectionId, ID.unique(), {
              site_name: 'Video Site',
              video_list_title: 'Featured Videos',
              crypto: [],
            });
            return res.json({ success: true, message: 'Configuração inicial do site criada' });
          }
          return res.json({ success: true, message: 'Configuração do site já existe' });
        } catch (err) {
          throw err;
        }
      }

      default:
        return res.status(400).json({ message: 'Ação não reconhecida' });
    }
  } catch (error) {
    console.error('Erro geral na function /api/setup:', error);
    return res.status(500).json({ message: `Erro interno: ${error?.message || 'desconhecido'}` });
  }
}

function getAttributesForType(type) {
  switch (type) {
    case 'video':
      return [
        { key: 'title', type: 'string', size: 255, required: true },
        { key: 'description', type: 'string', size: 2000, required: false },
        { key: 'price', type: 'float', required: true, min: 0 },
        { key: 'duration', type: 'integer', required: false, min: 0 },
        { key: 'video_id', type: 'string', size: 255, required: false },
        { key: 'thumbnail_id', type: 'string', size: 255, required: false },
        { key: 'created_at', type: 'datetime', required: false },
        { key: 'is_active', type: 'boolean', required: false },
        { key: 'views', type: 'integer', required: false, min: 0 },
        { key: 'product_link', type: 'string', size: 500, required: false },
      ];
    case 'user':
      return [
        { key: 'email', type: 'string', size: 255, required: true },
        { key: 'name', type: 'string', size: 255, required: true },
        { key: 'password', type: 'string', size: 255, required: true },
        { key: 'created_at', type: 'datetime', required: false },
      ];
    case 'config':
      return [
        { key: 'site_name', type: 'string', size: 255, required: true },
        { key: 'paypal_client_id', type: 'string', size: 255, required: false },
        { key: 'stripe_publishable_key', type: 'string', size: 255, required: false },
        { key: 'stripe_secret_key', type: 'string', size: 255, required: false },
        { key: 'telegram_username', type: 'string', size: 255, required: false },
        { key: 'video_list_title', type: 'string', size: 255, required: false },
        { key: 'crypto', type: 'string', size: 2000, required: false, array: true },
        { key: 'email_host', type: 'string', size: 255, required: false },
        { key: 'email_port', type: 'string', size: 10, required: false },
        { key: 'email_secure', type: 'boolean', required: false },
        { key: 'email_user', type: 'string', size: 255, required: false },
        { key: 'email_pass', type: 'string', size: 255, required: false },
        { key: 'email_from', type: 'string', size: 255, required: false },
      ];
    case 'session':
      return [
        { key: 'user_id', type: 'string', size: 255, required: true },
        { key: 'token', type: 'string', size: 255, required: true },
        { key: 'expires_at', type: 'datetime', required: true },
        { key: 'created_at', type: 'datetime', required: false },
        { key: 'ip_address', type: 'string', size: 45, required: false },
        { key: 'user_agent', type: 'string', size: 1000, required: false },
        { key: 'is_active', type: 'boolean', required: false },
      ];
    default:
      return [];
  }
}

function getIndexesForType(type) {
  switch (type) {
    case 'video':
      return [
        { key: 'title_index', type: 'key', attributes: ['title'] },
        { key: 'created_at_index', type: 'key', attributes: ['created_at'] },
        { key: 'is_active_index', type: 'key', attributes: ['is_active'] },
      ];
    case 'user':
      return [
        { key: 'email_index', type: 'unique', attributes: ['email'] },
      ];
    case 'session':
      return [
        { key: 'token_index', type: 'unique', attributes: ['token'] },
        { key: 'user_id_index', type: 'key', attributes: ['user_id'] },
        { key: 'expires_at_index', type: 'key', attributes: ['expires_at'] },
      ];
    default:
      return [];
  }
}

async function createAttribute(databases, databaseId, collectionId, attr) {
  if (attr.type === 'string') {
    return databases.createStringAttribute(databaseId, collectionId, attr.key, attr.size, attr.required, attr.default, !!attr.array);
  }
  if (attr.type === 'integer') {
    return databases.createIntegerAttribute(databaseId, collectionId, attr.key, attr.required, attr.min, attr.max, attr.default, !!attr.array);
  }
  if (attr.type === 'float') {
    return databases.createFloatAttribute(databaseId, collectionId, attr.key, attr.required, attr.min, attr.max, attr.default, !!attr.array);
  }
  if (attr.type === 'boolean') {
    return databases.createBooleanAttribute(databaseId, collectionId, attr.key, attr.required, attr.default, !!attr.array);
  }
  if (attr.type === 'datetime') {
    return databases.createDatetimeAttribute(databaseId, collectionId, attr.key, attr.required, attr.default, !!attr.array);
  }
}
