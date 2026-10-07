'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useClass } from '@/hooks/class';
import { useUser } from '@/hooks/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagMultiSelect } from '@/components/app/tag-multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export interface ClassRecord {
  uuid: string;
  name: string;
  capacity: number | null;
  status: string;
  teacher_uuid: string | null;
  teachers_uuid: string[];
  studentCount?: number;
}

interface ClassFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem?: ClassRecord | null;
  onSaved: () => void;
}

const emptyForm = {
  name: '',
  teacher_uuid: '',
  teachers_uuid: [] as string[],
  capacity: '',
};

export function ClassFormSheet({
  open,
  onOpenChange,
  classItem,
  onSaved,
}: ClassFormSheetProps) {
  const { create, update } = useClass();
  const { index: indexUsers } = useUser();
  const [teachers, setTeachers] = useState<{ uuid: string; name: string }[]>(
    [],
  );
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!classItem;

  useEffect(() => {
    if (open) {
      indexUsers('staff').then((response) => {
        if (response.success) {
          const academic = (response.data.user || [])
            .map((entry: any) => entry.user)
            .filter((user: any) => user.position === 'ACADEMIC');
          setTeachers(academic);
        }
      });
      setFormData(
        classItem
          ? {
              name: classItem.name || '',
              teacher_uuid: classItem.teacher_uuid || '',
              teachers_uuid: classItem.teachers_uuid || [],
              capacity: classItem.capacity ? String(classItem.capacity) : '',
            }
          : emptyForm,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, classItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Class name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        teacher_uuid: formData.teacher_uuid || null,
        teachers_uuid: Array.from(
          new Set([
            ...(formData.teachers_uuid || []),
            ...(formData.teacher_uuid ? [formData.teacher_uuid] : []),
          ]),
        ),
        capacity: formData.capacity ? Number(formData.capacity) : 0,
      };

      const response = isEdit
        ? await update(classItem!.uuid, payload)
        : await create(payload);

      if (response.success) {
        toast.success(`Class ${isEdit ? 'updated' : 'created'} successfully`);
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(response.message || 'Something went wrong');
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-md overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Class' : 'Add Class'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className='flex flex-col gap-5 px-4 pb-6'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Class name</Label>
            <Input
              id='name'
              placeholder='Enter class name'
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className='space-y-2'>
            <Label>Class teacher</Label>
            <Select
              value={formData.teacher_uuid}
              onValueChange={(value) =>
                setFormData({ ...formData, teacher_uuid: value })
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select teacher' />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.uuid} value={teacher.uuid}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TagMultiSelect
            label='Staff with class access'
            placeholder='Select staff'
            options={teachers}
            selected={formData.teachers_uuid}
            all={false}
            onChange={(next) =>
              setFormData({ ...formData, teachers_uuid: next })
            }
          />

          <p className='-mt-3 text-xs text-muted-foreground'>
            The class teacher above is always included in class access.
          </p>

          <div className='space-y-2'>
            <Label htmlFor='capacity'>Max capacity</Label>
            <Input
              id='capacity'
              type='number'
              min={0}
              placeholder='0'
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
            />
          </div>

          <Button type='submit' disabled={submitting} className='w-full'>
            {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add class'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
