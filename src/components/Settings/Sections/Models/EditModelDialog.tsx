import { Dialog, DialogPanel } from '@headlessui/react';
import { Loader2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfigModelProvider } from '@/lib/config/types';
import { toast } from 'sonner';

const EditModel = ({
  providerId,
  modelProvider,
  setProviders,
  type,
  model,
}: {
  providerId: string;
  modelProvider: ConfigModelProvider;
  setProviders: React.Dispatch<React.SetStateAction<ConfigModelProvider[]>>;
  type: 'chat' | 'embedding';
  model: { name: string; key: string };
}) => {
  const [open, setOpen] = useState(false);
  const [modelName, setModelName] = useState(model.name);
  const [modelKey, setModelKey] = useState(model.key);
  const [keyError, setKeyError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKeyBlur = () => {
    if (modelKey === model.key) {
      setKeyError('');
      return;
    }

    const models = type === 'chat' ? modelProvider.chatModels : modelProvider.embeddingModels;
    const duplicate = models.some((m) => m.key === modelKey);

    if (duplicate) {
      setKeyError('A model with this key already exists');
    } else {
      setKeyError('');
    }
  };

  const updateDefaultModelReferences = (
    oldKey: string,
    newKey: string,
  ) => {
    if (type === 'chat') {
      const storedProviderId = localStorage.getItem('chatModelProviderId');
      const storedKey = localStorage.getItem('chatModelKey');

      if (storedProviderId === providerId && storedKey === oldKey) {
        localStorage.setItem('chatModelKey', newKey);
      }
    } else {
      const storedProviderId = localStorage.getItem('embeddingModelProviderId');
      const storedKey = localStorage.getItem('embeddingModelKey');

      if (storedProviderId === providerId && storedKey === oldKey) {
        localStorage.setItem('embeddingModelKey', newKey);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (keyError) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/providers/${providerId}/models/${encodeURIComponent(model.key)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: modelName,
            key: modelKey,
            type: type,
          }),
        },
      );

      if (!res.ok) {
        let errorMessage = 'Failed to update model';
        try {
          const error = await res.json();
          errorMessage = error.message || errorMessage;
        } catch {
          // Response is not JSON, use default error message
        }
        throw new Error(errorMessage);
      }

      // Update localStorage if this model is currently selected
      updateDefaultModelReferences(model.key, modelKey);

      // Update UI state
      setProviders((prev) =>
        prev.map((provider) => {
          if (provider.id === providerId) {
            return {
              ...provider,
              chatModels:
                type === 'chat'
                  ? provider.chatModels.map((m) =>
                      m.key === model.key
                        ? { name: modelName, key: modelKey }
                        : m,
                    )
                  : provider.chatModels,
              embeddingModels:
                type === 'embedding'
                  ? provider.embeddingModels.map((m) =>
                      m.key === model.key
                        ? { name: modelName, key: modelKey }
                        : m,
                    )
                  : provider.embeddingModels,
            };
          }
          return provider;
        }),
      );

      toast.success('Model updated successfully.');
      setOpen(false);
    } catch (error: any) {
      console.error('Error updating model:', error);
      toast.error(error.message || 'Failed to update model.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setModelName(model.name);
          setModelKey(model.key);
          setKeyError('');
          setOpen(true);
        }}
        className="hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
      >
        <Pencil size={12} />
      </button>
      <AnimatePresence>
        {open && (
          <Dialog
            static
            open={open}
            onClose={() => setOpen(false)}
            className="relative z-[60]"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="fixed inset-0 flex w-screen items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            >
              <DialogPanel className="w-full mx-4 lg:w-[600px] max-h-[85vh] flex flex-col border bg-light-primary dark:bg-dark-primary border-light-secondary dark:border-dark-secondary rounded-lg">
                <div className="px-6 pt-6 pb-4">
                  <h3 className="text-black/90 dark:text-white/90 font-medium text-sm">
                    Edit {type === 'chat' ? 'chat' : 'embedding'} model
                  </h3>
                </div>
                <div className="border-t border-light-200 dark:border-dark-200" />
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col h-full"
                  >
                    <div className="flex flex-col space-y-4 flex-1">
                      <div className="flex flex-col items-start space-y-2">
                        <label className="text-xs text-black/70 dark:text-white/70">
                          Model name*
                        </label>
                        <input
                          value={modelName}
                          onChange={(e) => setModelName(e.target.value)}
                          className="w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-4 py-3 text-[13px] text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="e.g., GPT-4"
                          type="text"
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="flex flex-col items-start space-y-2">
                        <label className="text-xs text-black/70 dark:text-white/70">
                          Model key*
                        </label>
                        <input
                          value={modelKey}
                          onChange={(e) => {
                            setModelKey(e.target.value);
                            if (keyError) setKeyError('');
                          }}
                          onBlur={handleKeyBlur}
                          className="w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-4 py-3 text-[13px] text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="e.g., gpt-4"
                          type="text"
                          required
                          disabled={loading}
                        />
                        {keyError && (
                          <p className="text-xs text-red-500 dark:text-red-400">
                            {keyError}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-light-200 dark:border-dark-200 -mx-6 my-4" />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading || !!keyError}
                        className="px-4 py-2 rounded-lg text-[13px] bg-sky-500 text-white font-medium disabled:opacity-85 hover:opacity-85 active:scale-95 transition duration-200"
                      >
                        {loading ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </DialogPanel>
            </motion.div>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
};

export default EditModel;
