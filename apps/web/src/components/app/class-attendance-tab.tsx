'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Search } from 'lucide-react';

import { useStudentAttendance } from '@/hooks/student-attendance';
import type { EnrolledFace } from '@/lib/face-recognition';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FacialRecognitionModal } from '@/components/app/facial-recognition-modal';

interface ClassAttendanceTabProps {
  classUuid: string;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PRESENT: 'bg-emerald-100 text-emerald-700',
  ABSENT: 'bg-red-100 text-red-700',
};

export function ClassAttendanceTab({ classUuid }: ClassAttendanceTabProps) {
  const { index, faces, mark, update } = useStudentAttendance();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [log, setLog] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState<EnrolledFace[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [savingUuid, setSavingUuid] = useState<string | null>(null);

  const fetchLog = async () => {
    const response = await index(classUuid, date);
    if (response.success) {
      setLog(response.data.log || []);
    } else {
      toast.error(response.message || 'Failed to load attendance');
    }
  };

  const fetchFaces = async () => {
    const response = await faces(classUuid);
    if (response.success) {
      setEnrolled(response.data.students || []);
    }
  };

  useEffect(() => {
    fetchLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classUuid, date]);

  useEffect(() => {
    fetchFaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classUuid]);

  const handleMatchConfirmed = async (match: {
    uuid: string;
    status?: 'PRESENT' | 'ABSENT' | 'PENDING';
  }) => {
    const status = match.status ? match.status : 'PRESENT';
    const response = await mark(match.uuid, status);
    if (response.success) {
      toast.success('Attendance marked');
      fetchLog();
    } else {
      toast.error(response.message || 'Failed to mark attendance');
    }
  };

  const handleStatusChange = async (
    attendanceUuid: string,
    status: 'PRESENT' | 'ABSENT' | 'PENDING',
  ) => {
    setSavingUuid(attendanceUuid);
    try {
      const response = await update(attendanceUuid, status);
      if (response.success) {
        fetchLog();
      } else {
        toast.error(response.message || 'Failed to update attendance');
      }
    } finally {
      setSavingUuid(null);
    }
  };

  const filteredLog = log.filter(
    (entry) =>
      !search ||
      entry.student.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative w-full sm:max-w-xs'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search'
            className='pl-8'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className='flex items-center gap-2'>
          <Input
            type='date'
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className='w-40'
          />
          <Button size='sm' onClick={() => setModalOpen(true)}>
            Mark attendance
          </Button>
        </div>
      </div>

      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLog.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className='h-24 text-center text-muted-foreground'
                >
                  No students in this class.
                </TableCell>
              </TableRow>
            ) : (
              filteredLog.map(({ student, attendance }) => (
                <TableRow key={student.uuid}>
                  <TableCell className='font-medium'>
                    <div className='flex items-center gap-2'>
                      <Avatar className='h-8 w-8'>
                        <AvatarImage
                          src={student.avatar || ''}
                          alt={student.name}
                        />
                        <AvatarFallback>
                          {student.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {student.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {attendance
                      ? new Date(attendance.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={STATUS_STYLE[attendance?.status || 'PENDING']}
                    >
                      {attendance?.status
                        ? attendance.status.charAt(0) +
                          attendance.status.slice(1).toLowerCase()
                        : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    {attendance ? (
                      <Select
                        value={attendance.status}
                        onValueChange={(value) =>
                          handleStatusChange(
                            attendance.uuid,
                            value as 'PRESENT' | 'ABSENT' | 'PENDING',
                          )
                        }
                        disabled={savingUuid === attendance.uuid}
                      >
                        <SelectTrigger size='sm' className='w-28 ml-auto'>
                          <Pencil className='h-3.5 w-3.5' />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='PENDING'>Pending</SelectItem>
                          <SelectItem value='PRESENT'>Present</SelectItem>
                          <SelectItem value='ABSENT'>Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select
                        value='PENDING'
                        onValueChange={(value) =>
                          handleMatchConfirmed({
                            uuid: student.uuid,
                            status: value as 'PRESENT' | 'ABSENT' | 'PENDING',
                          })
                        }
                      >
                        <SelectTrigger size='sm' className='w-28 ml-auto'>
                          <Pencil className='h-3.5 w-3.5' />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='PENDING'>Pending</SelectItem>
                          <SelectItem value='PRESENT'>Present</SelectItem>
                          <SelectItem value='ABSENT'>Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FacialRecognitionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        enrolled={enrolled}
        subjectLabel='Student'
        onConfirm={handleMatchConfirmed}
      />
    </div>
  );
}
