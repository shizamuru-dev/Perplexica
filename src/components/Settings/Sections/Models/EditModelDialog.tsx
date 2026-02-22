import { Dialog, DialogPanel } from '@headlessui/react';
import { Loader2, Pencil, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfigModelProvider } from '@/lib/config/types';
import { toast } from 'sonner';
import { Switch } from '@headlessui/react';

const EditModel = ({
  providerId,
  modelProvider,
  setProviders,
  type,
  model,
  onRefreshRequired,
}: {
  providerId: string;
  modelProvider: ConfigModelProvider;
  setProviders: React.Dispatch<React.SetStateAction<ConfigModelProvider[]>>;
  type: 'chat' | 'embedding';
  model: { name: string; key: string; supportsVision?: boolean };
  onRefreshRequired?: () => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [modelName, setModelName] = useState(model.name);
  const [modelKey, setModelKey] = useState(model.key);
  const [supportsVision, setSupportsVision] = useState(model.supportsVision || false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [loading, setLoading] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('EditModel mounted:', {
      providerId: modelProvider.id,
      providerName: modelProvider.name,
      modelKey: model.key,
      modelName: model.name,
      availableChatModels: modelProvider.chatModels.map(m => m.key),
      availableEmbeddingModels: modelProvider.embeddingModels.map(m => m.key),
      type
    });
  }, []);

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
      // First, fetch fresh provider data to ensure model exists
      console.log('Fetching fresh provider data before update...');
      const providersRes = await fetch('/api/providers');
      const providersData = await providersRes.json();
      
      const freshProvider = providersData.providers.find(
        (p: ConfigModelProvider) => p.id === modelProvider.id,
      );

      if (!freshProvider) {
        throw new Error('Provider not found');
      }

      const freshModels = type === 'chat' ? freshProvider.chatModels : freshProvider.embeddingModels;
      const modelExists = freshModels.some((m: any) => m.key === model.key);

      if (!modelExists) {
        toast.error(
          `Model "${model.key}" not found in provider. The model may have been deleted. Please refresh the page.`,
        );
        console.error('Model not found in fresh provider data:', {
          modelKey: model.key,
          providerId: modelProvider.id,
          type,
          availableKeys: freshModels.map((m: any) => m.key),
        });
        
        // Attempt to refresh provider data
        if (onRefreshRequired) {
          await onRefreshRequired();
        }
        
        setLoading(false);
        setOpen(false);
        return;
      }

      console.log('Model found in fresh provider, proceeding with update...');

      const res = await fetch(
        `/api/providers/${modelProvider.id}/models/${encodeURIComponent(model.key)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: modelName,
            key: modelKey,
            type: type,
            supportsVision: supportsVision,
          }),
        },
      );

      if (!res.ok) {
        let errorMessage = 'Failed to update model';
        try {
          const error = await res.json();
          errorMessage = error.message || errorMessage;
          console.error('Update failed:', {
            status: res.status,
            error,
            requestData: {
              providerId: modelProvider.id,
              oldKey: model.key,
              newData: { name: modelName, key: modelKey, supportsVision, type }
            }
          });
        } catch {
          console.error('Update failed with non-JSON response:', res.status);
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();
      console.log('Model updated successfully:', result);

      // Update localStorage if this model is currently selected
      updateDefaultModelReferences(model.key, modelKey);

      // Refresh provider data to ensure UI is in sync
      if (onRefreshRequired) {
        await onRefreshRequired();
      } else {
        // Fallback: Update UI state if no refresh callback
        setProviders((prev) =>
          prev.map((provider) => {
            if (provider.id === modelProvider.id) {
              return {
                ...provider,
                chatModels:
                  type === 'chat'
                    ? provider.chatModels.map((m) => {
                        // Update the model that matches the original key
                        if (m.key === model.key) {
                          return { ...m, name: modelName, key: modelKey, supportsVision: supportsVision };
                        }
                        return m;
                      })
                    : provider.chatModels,
                embeddingModels:
                  type === 'embedding'
                    ? provider.embeddingModels.map((m) => {
                        // Update the model that matches the original key
                        if (m.key === model.key) {
                          return { ...m, name: modelName, key: modelKey, supportsVision: supportsVision };
                        }
                        return m;
                      })
                    : provider.embeddingModels,
              };
            }
            return provider;
          }),
        );
      }

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
          setSupportsVision(model.supportsVision || false);
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
                      {type === 'chat' && (
                        <div className="rounded-lg border border-light-200 dark:border-dark-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setAdvancedOpen((v) => !v)}
                            disabled={loading}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-black/60 dark:text-white/60 hover:text-black/80 dark:hover:text-white/80 transition-colors disabled:opacity-60"
                          >
                            <span className="font-medium">Advanced Settings</span>
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-200 ${
                                advancedOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          <AnimatePresence initial={false}>
                            {advancedOpen && (
                              <motion.div
                                key="advanced"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-light-200 dark:border-dark-200 px-3 py-3 flex flex-row items-center justify-between">
                                  <div>
                                    <label className="text-xs text-black/70 dark:text-white/70 font-medium">
                                      Supports Vision
                                    </label>
                                    <p className="text-[11px] text-black/50 dark:text-white/50">
                                      Enable image uploads for this model
                                    </p>
                                  </div>
                                  <Switch
                                    checked={supportsVision}
                                    onChange={setSupportsVision}
                                    className="group relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none"
                                    disabled={loading}
                                  >
                                    <span className="sr-only">Supports Vision</span>
                                    <span
                                      aria-hidden="true"
                                      className="pointer-events-none absolute h-full w-full rounded-md"
                                    />
                                    <span
                                      aria-hidden="true"
                                      className={`pointer-events-none absolute mx-auto h-4 w-9 rounded-full transition-colors duration-200 ease-in-out ${
                                        supportsVision
                                          ? 'bg-sky-500'
                                          : 'bg-light-200 dark:bg-dark-200'
                                      }`}
                                    />
                                    <span
                                      aria-hidden="true"
                                      className={`pointer-events-none absolute left-0 inline-block h-5 w-5 transform rounded-full border border-light-200 bg-white shadow ring-0 transition-transform duration-200 ease-in-out dark:border-dark-200 dark:bg-dark-secondary ${
                                        supportsVision ? 'translate-x-5' : 'translate-x-0'
                                      }`}
                                    />
                                  </Switch>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
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
