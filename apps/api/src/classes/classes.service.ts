import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../cache/cache.service.js';
import { DecodedUser } from '../common/types/auth.js';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private cacheKey(branchUuid: string, decoded: DecodedUser) {
    const scope = decoded.position === 'ACADEMIC' ? decoded.uuid : 'all';
    return `classes:index:${branchUuid}:${scope}`;
  }

  async index(branchUuid: string | undefined, decoded: DecodedUser) {
    if (!branchUuid) {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Branch session ID (x-branch-session) is required',
      });
    }

    const classesWithStudentCount = await this.cache.remember(
      this.cacheKey(branchUuid, decoded),
      60,
      async () => {
        let classes: any = [];

        if (decoded.position === 'ADMINISTRATIVE') {
          classes = await this.prisma.class.findMany({
            where: { branch_uuid: branchUuid },
            include: { students: true },
            orderBy: { created_at: 'asc' },
          });
        } else if (decoded.position === 'ACADEMIC') {
          classes = await this.prisma.class.findMany({
            where: {
              branch_uuid: branchUuid,
              OR: [
                { teacher_uuid: decoded.uuid },
                { teachers_uuid: { has: decoded.uuid } },
              ],
            },
            include: { students: true },
            orderBy: { created_at: 'asc' },
          });
        }

        return classes.map((cls: any) => ({
          ...cls,
          studentCount: cls.students.length,
        }));
      },
    );

    return {
      status: 200,
      success: true,
      message: 'Classes retrieved successfully',
      data: { classes: classesWithStudentCount },
    };
  }

  async create(
    branchUuid: string | undefined,
    decoded: DecodedUser,
    body: any,
  ) {
    const { name, capacity, teacher_uuid, teachers_uuid } = body;
    const updated_teachers_uuid = Array.isArray(teachers_uuid)
      ? teachers_uuid.filter(Boolean)
      : [];
    if (teacher_uuid && !updated_teachers_uuid.includes(teacher_uuid))
      updated_teachers_uuid.unshift(teacher_uuid);

    if (decoded.position !== 'ADMINISTRATIVE') {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!branchUuid || !name) {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'School UUID and class name are required',
      });
    }

    const result = await this.prisma.class.create({
      data: {
        name,
        capacity,
        branch_uuid: branchUuid,
        teacher_uuid,
        teachers_uuid,
      },
    });
    await this.cache.delByPrefix(`classes:index:${branchUuid}:`);

    return {
      status: 201,
      success: true,
      message: 'Class created successfully',
      data: { class: result },
    };
  }

  async show(uuid: string) {
    if (!uuid) {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'School UUID and class UUID are required',
      });
    }

    const classData = await this.prisma.class.findUnique({
      where: { uuid },
      include: { teacher: true, students: true },
    });

    if (!classData) {
      throw new NotFoundException({
        status: 404,
        success: false,
        message: 'Class not found',
      });
    }

    return {
      status: 200,
      success: true,
      message: 'Class retrieved successfully',
      data: { class: classData },
    };
  }

  async update(uuid: string, decoded: DecodedUser, body: any) {
    const { name, capacity, teacher_uuid, teachers_uuid } = body;
    const updated_teachers_uuid = Array.isArray(teachers_uuid)
      ? teachers_uuid.filter(Boolean)
      : [];
    if (teacher_uuid && !updated_teachers_uuid.includes(teacher_uuid))
      updated_teachers_uuid.unshift(teacher_uuid);

    if (decoded.position !== 'ADMINISTRATIVE') {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Unauthorized',
      });
    }

    const updatedClass = await this.prisma.class.update({
      where: { uuid },
      data: { name, capacity, teacher_uuid, teachers_uuid },
    });

    if (!updatedClass) {
      throw new NotFoundException({
        status: 404,
        success: false,
        message: 'Class not found',
      });
    }
    await this.cache.delByPrefix(`classes:index:${updatedClass.branch_uuid}:`);

    return {
      status: 200,
      success: true,
      message: 'Class updated successfully',
      data: { class: updatedClass },
    };
  }

  async remove(uuid: string, decoded: DecodedUser) {
    if (decoded.position !== 'ADMINISTRATIVE') {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Unauthorized',
      });
    }

    const classWithStudents = await this.prisma.class.findUnique({
      where: { uuid },
      include: { students: true },
    });

    if (!classWithStudents) {
      throw new NotFoundException({
        status: 404,
        success: false,
        message: 'Class not found',
      });
    }

    if (classWithStudents.students.length > 0) {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Cannot delete class with students enrolled',
      });
    }

    await this.prisma.class.delete({ where: { uuid } });
    await this.cache.delByPrefix(
      `classes:index:${classWithStudents.branch_uuid}:`,
    );

    return {
      status: 200,
      success: true,
      message: 'Class deleted successfully',
    };
  }
}
