'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Plus, Trash2, CircleHelp, Save, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export default function FAQManagement() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    const [formData, setFormData] = useState({
        question: '',
        answer: '',
        category: 'general'
    });

    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({
        question: '',
        answer: '',
        category: 'general'
    });

    const fetchFaqs = async () => {
        try {
            const res = await api.faq.list();
            setFaqs(res.data.faqs);
        } catch (err) {
            toast.error("Failed to load FAQs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFaqs();
    }, []);

    const handleCreate = async () => {
        if (!formData.question || !formData.answer) return;
        try {
            await api.faq.create(formData);
            toast.success("Query record added to repository");
            setIsAdding(false);
            setFormData({ question: '', answer: '', category: 'general' });
            fetchFaqs();
        } catch (err) {
            toast.error("Failed to save query");
        }
    };

    const handleEdit = (faq) => {
        setEditingId(faq._id);
        setEditData({
            question: faq.question,
            answer: faq.answer,
            category: faq.category
        });
        setIsAdding(false); // Close create form if open
    };

    const handleUpdate = async () => {
        if (!editData.question || !editData.answer) return;
        try {
            await api.faq.update(editingId, editData);
            toast.success("Query record updated successfully");
            setEditingId(null);
            fetchFaqs();
        } catch (err) {
            toast.error("Failed to update record");
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.faq.delete(id);
            toast.success("Query record removed");
            fetchFaqs();
        } catch (err) {
            toast.error("Failed to remove record");
        }
    };

    const filteredFaqs = faqs.filter(f => 
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 md:p-6 max-w-full mx-auto space-y-6 overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-noto-bold text-foreground tracking-tight">Query Repository</h1>
                    <p className="mt-1 text-sm font-noto-medium text-muted-foreground/80 tracking-wide">Manage the official knowledge base for guests</p>
                </div>
                <Button 
                    onClick={() => setIsAdding(true)}
                    className="bg-[#0056b3] hover:bg-[#004494] text-xs font-noto-semibold h-10 px-6 rounded-sm shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-2" /> New Record
                </Button>
            </div>

            {/* Filters/Search Row */}
            <div className="flex items-center gap-3">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Filter records..." 
                        className="pl-9 text-xs border-border bg-background h-10 rounded-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {isAdding && (
                <Card className="border border-border bg-card shadow-sm animate-in fade-in slide-in-from-top-4 rounded-sm">
                    <CardHeader className="bg-muted/30 border-b border-border py-4">
                        <CardTitle className="text-sm font-noto-semibold text-foreground flex items-center gap-2">
                             <Plus className="h-4 w-4 text-[#0056b3]" /> Add New Query Record
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-noto-semibold text-muted-foreground">Category</Label>
                                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                                    <SelectTrigger className="border-border rounded-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['general', 'booking', 'check-in', 'amenities', 'other'].map(c => (
                                            <SelectItem key={c} value={c} className="capitalize text-xs font-noto-medium">{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] font-noto-semibold text-muted-foreground">Subject Question</Label>
                                <Input 
                                    className="border-border rounded-sm text-xs font-noto-medium"
                                    value={formData.question}
                                    placeholder="Enter the guest query here..."
                                    onChange={(e) => setFormData({...formData, question: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] font-noto-semibold text-muted-foreground">Official Answer</Label>
                            <Textarea 
                                className="border-border rounded-sm text-xs min-h-[100px] font-noto-regular"
                                placeholder="Provide the authoritative response..."
                                value={formData.answer}
                                onChange={(e) => setFormData({...formData, answer: e.target.value})}
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                            <Button variant="outline" onClick={() => setIsAdding(false)} className="text-xs font-noto-semibold h-9 rounded-sm">Cancel</Button>
                            <Button onClick={handleCreate} className="bg-[#0056b3] hover:bg-[#004494] text-xs font-noto-semibold h-9 px-8 rounded-sm text-white shadow-sm">
                                <Save className="h-4 w-4 mr-2" /> Commit Record
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center border border-border rounded-sm bg-muted/5">
                        <Loader2 className="h-10 w-10 animate-spin mb-4 text-[#0056b3]" />
                        <span className="text-sm font-noto-medium text-muted-foreground">Accessing repository records...</span>
                    </div>
                ) : filteredFaqs.length === 0 ? (
                    <div className="py-24 text-center border border-dashed border-border rounded-sm bg-muted/5 flex flex-col items-center justify-center">
                        <CircleHelp className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm font-noto-medium text-muted-foreground italic">No matching records found in the official repository.</p>
                    </div>
                ) : (
                    filteredFaqs.map(faq => {
                        const isEditingThis = editingId === faq._id;
                        
                        if (isEditingThis) {
                            return (
                                <Card key={faq._id} className="border border-[#0056b3] bg-card shadow-md animate-in fade-in slide-in-from-top-2 rounded-sm ring-1 ring-[#0056b3]/20">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-noto-semibold text-muted-foreground">Category</Label>
                                                <Select value={editData.category} onValueChange={(v) => setEditData({...editData, category: v})}>
                                                    <SelectTrigger className="border-border rounded-sm h-10"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {['general', 'booking', 'check-in', 'amenities', 'other'].map(c => (
                                                            <SelectItem key={c} value={c} className="capitalize text-xs font-noto-medium">{c}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-noto-semibold text-muted-foreground">Subject Question</Label>
                                                <Input 
                                                    className="border-border rounded-sm text-xs h-10 font-noto-medium"
                                                    value={editData.question}
                                                    onChange={(e) => setEditData({...editData, question: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-noto-semibold text-muted-foreground">Official Answer</Label>
                                            <Textarea 
                                                className="border-border rounded-sm text-xs min-h-[100px] font-noto-regular"
                                                value={editData.answer}
                                                onChange={(e) => setEditData({...editData, answer: e.target.value})}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                                            <Button variant="outline" onClick={() => setEditingId(null)} className="text-xs font-noto-semibold h-9 rounded-sm px-4">Cancel</Button>
                                            <Button onClick={handleUpdate} className="bg-[#0056b3] hover:bg-[#004494] text-xs font-noto-semibold h-9 px-8 rounded-sm text-white shadow-sm">
                                                <Save className="h-4 w-4 mr-2" /> Save Changes
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        }

                        return (
                            <Card key={faq._id} className="border border-border hover:border-[#0056b3]/30 transition-all bg-card shadow-xs rounded-sm group">
                                <CardContent className="p-0">
                                    <div className="p-5 flex items-start justify-between gap-6">
                                        <div className="flex items-start gap-5 flex-1">
                                            <Badge className="bg-primary/5 text-primary border-primary/20 capitalize text-[10px] font-noto-semibold px-2.5 py-0.5 rounded-full shrink-0 mt-1">{faq.category}</Badge>
                                            <div className="space-y-4">
                                                <h3 className="text-[16px] font-noto-semibold text-foreground leading-snug">{faq.question}</h3>
                                                <div className="text-[14px] font-noto-regular text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                                    {faq.answer}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-muted-foreground hover:text-[#0056b3] h-8 w-8 rounded-sm"
                                                onClick={() => handleEdit(faq)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-muted-foreground hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-sm"
                                                onClick={() => handleDelete(faq._id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
