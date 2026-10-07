import { axiosInstance } from '@/lib/axios';

export const useClass = () => {
  const index = async () => {
    const response = await axiosInstance.get('/api/v1/class/index');
    const data = response.data;

    if (!data.success || !data.data) {
      return {
        success: false,
        message: data.message || 'Something went wrong',
      };
    } else {
      return {
        success: true,
        data: data.data,
      };
    }
  };

  const show = async (uuid: string) => {
    const response = await axiosInstance.get(`/api/v1/class/show/${uuid}`);
    const data = response.data;

    if (!data.success || !data.data) {
      return {
        success: false,
        message: data.message || 'Something went wrong',
      };
    } else {
      return {
        success: true,
        data: data.data,
      };
    }
  };

  const create = async (classData: any) => {
    const response = await axiosInstance.post('/api/v1/class/create', {
      name: classData.name,
      capacity: classData.capacity,
      teacher_uuid: classData.teacher_uuid,
      teachers_uuid: classData.teachers_uuid,
    });
    const data = response.data;

    if (!data.success || !data.data) {
      return {
        success: false,
        message: data.message || 'Something went wrong',
      };
    } else {
      return {
        success: true,
        data: data.data,
      };
    }
  };

  const update = async (uuid: string | null, classData: any) => {
    if (!uuid) {
      return {
        success: false,
        message: 'UUID is required for updating class',
      };
    }
    const response = await axiosInstance.patch(`/api/v1/class/update/${uuid}`, {
      name: classData.name,
      capacity: classData.capacity,
      teacher_uuid: classData.teacher_uuid,
      teachers_uuid: classData.teachers_uuid,
    });
    const data = response.data;

    if (!data.success || !data.data) {
      return {
        success: false,
        message: data.message || 'Something went wrong',
      };
    } else {
      return {
        success: true,
        data: data.data,
      };
    }
  };

  const remove = async (uuid: string) => {
    const response = await axiosInstance.delete(`/api/v1/class/delete/${uuid}`);
    const data = response.data;
    if (!data.success) {
      return {
        success: false,
        message: data.message || 'Something went wrong',
      };
    } else {
      return {
        success: true,
        message: 'Class deleted successfully',
      };
    }
  };

  return {
    index,
    show,
    create,
    update,
    remove,
  };
};
