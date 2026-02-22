import { Dialog, DialogPanel } from '@headlessui/react';
import { Loader2, Plus, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfigModelProvider } from '@/lib/config/types';
import { toast } from 'sonner';
import { Switch } from '@headlessui/react';

const AddModel = ({
  providerId,
  setProviders,
  type,
}: {
  providerId: string;
  setProviders: React.Dispatch<React.SetStateAction<ConfigModelProvider[]>>;
  type: 'chat' | 'embedding';
}) => {
  const [open, setOpen] = useState(false);
  const [modelName, setModelName] = useState('');
  const [modelKey, setModelKey] = useState('');
  const [supportsVision, setSupportsVision] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/providers/${providerId}/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
          key: modelKey,
          type: type,
          supportsVision: supportsVision,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add model');
      }

      setProviders((prev) =>
        prev.map((provider) => {
          if (provider.id === providerId) {
            const newModel = { name: modelName, key: modelKey, supportsVision: supportsVision };
            return {
              ...provider,
              chatModels:
                type === 'chat'
                  ? [...provider.chatModels, newModel]
                  : provider.chatModels,
              embeddingModels:
                type === 'embedding'
                  ? [...provider.embeddingModels, newModel]
                  : provider.embeddingModels,
            };
          }
          return provider;
        }),
      );

      toast.success('Model added successfully.');
      setModelName('');
      setModelKey('');
      setSupportsVision(false);
      setOpen(false);
    } catch (error) {
      console.error('Error adding model:', error);
      toast.error('Failed to add model.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-black/70 dark:text-white/70 hover:text-black hover:dark:text-white flex flex-row items-center space-x-1 active:scale-95 transition duration-200"
      >
        <Plus size={12} />
        <span>Add</span>
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
                    Add new {type === 'chat' ? 'chat' : 'embedding'} model
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
                        />
                      </div>
                      <div className="flex flex-col items-start space-y-2">
                        <label className="text-xs text-black/70 dark:text-white/70">
                          Model key*
                        </label>
                        <input
                          value={modelKey}
                          onChange={(e) => setModelKey(e.target.value)}
                          className="w-full rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-4 py-3 text-[13px] text-black/80 dark:text-white/80 placeholder:text-black/40 dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:border-light-300 dark:focus-visible:border-dark-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="e.g., gpt-4"
                          type="text"
                          required
                        />
                      </div>
                      {type === 'chat' && (
                        <div className="rounded-lg border border-light-200 dark:border-dark-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setAdvancedOpen((v) => !v)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-black/60 dark:text-white/60 hover:text-black/80 dark:hover:text-white/80 transition-colors"
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
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-[13px] bg-sky-500 text-white font-medium disabled:opacity-85 hover:opacity-85 active:scale-95 transition duration-200"
                      >
                        {loading ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          'Add Model'
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

export default AddModel;
