import ModelRegistry from '@/lib/models/registry';
import { NextRequest } from 'next/server';

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; key: string }> },
) => {
  try {
    const { id, key } = await params;
    const decodedKey = decodeURIComponent(key);
    const body: {
      name: string;
      key: string;
      type: 'embedding' | 'chat';
      supportsVision?: boolean;
    } = await req.json();

    console.log('Updating model:', { providerId: id, oldKey: decodedKey, newModel: body });

    if (!body.name || !body.key) {
      return Response.json(
        {
          message: 'Name and key are required',
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();

    const updatedModel = await registry.updateProviderModel(
      id,
      body.type,
      decodedKey, // old key
      { name: body.name, key: body.key, supportsVision: body.supportsVision },
    );

    console.log('Model updated successfully:', updatedModel);

    return Response.json(
      {
        model: updatedModel,
        message: 'Model updated successfully',
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error('An error occurred while updating provider model', err);
    
    const isDuplicate = err.message?.includes('already exists');
    const isNotFound = err.message?.includes('not found');
    
    return Response.json(
      {
        message: err.message || 'An error has occurred.',
      },
      {
        status: isDuplicate ? 409 : isNotFound ? 404 : 500,
      },
    );
  }
};
