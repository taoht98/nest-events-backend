import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate, PaginateOptions } from 'src/pagination/paginator';
import { Repository } from 'typeorm';
import { AttendeeAnswerEnum } from './attendee.entity';
import { Event, PaginatedEvents } from './event.entity';
import { ListEvents, WhenEventFilter } from './input/list.events';
import { CreateEventDto } from './input/create-event.dto';
import { User } from 'src/auth/user.entity';
import { UpdateEventDto } from './input/update-event.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}
  private getEventsBaseQuery() {
    return this.eventsRepository
      .createQueryBuilder('e')
      .orderBy('e.id', 'DESC');
  }

  public getEventsWithAttendeeCountQuery() {
    return this.getEventsBaseQuery()
      .loadRelationCountAndMap('e.attendeeCount', 'e.attendees')
      .loadRelationCountAndMap(
        'e.ettendeeRejected',
        'e.attendees',
        'attendee',
        (qb) =>
          qb.where('attendee.answer = :answer', {
            answer: AttendeeAnswerEnum.Rejected,
          }),
      );
  }

  private async getEventsWithAttendeeCountFiltered(filter?: ListEvents) {
    let query = this.getEventsWithAttendeeCountQuery();

    if (!filter) {
      return query;
    }

    if (filter.when) {
      if (filter.when === WhenEventFilter.Today) {
        query = query.andWhere(
          `e.when >= CURDATE() AND e.when <= CRUDATE() + INTERVAL 1 DAY`,
        );
      }

      if (filter.when === WhenEventFilter.Tomorrow) {
        query = query.andWhere(
          `e.when >= CURDATE() + INTERVAL 1 DAY AND e.when <= CRUDATE() + INTERVAL 2 DAY`,
        );
      }

      if (filter.when === WhenEventFilter.ThisWeek) {
        query = query.andWhere('YEARWEEK(e.when, 1) = YEARWEEK(CRUDATE(), 1)');
      }

      if (filter.when === WhenEventFilter.NextWeek) {
        query = query.andWhere(
          'YEARWEEK(e.when, 1) = YEARWEEK(CRUDATE(), 1) + 1',
        );
      }
    }

    return await query;
  }

  public async getEventsWithAttendeeCountFilteredPaginated(
    filter: ListEvents,
    paginateOptions: PaginateOptions,
  ): Promise<PaginatedEvents> {
    return await paginate(
      await this.getEventsWithAttendeeCountFiltered(filter),
      paginateOptions,
    );
  }

  public async getEvent(id: number): Promise<Event | undefined> {
    const query = await this.getEventsBaseQuery().andWhere('e.id = :id', {
      id,
    });

    this.logger.debug(query.getSql());

    return await query.getOne();
  }

  public async createEvent(input: CreateEventDto, user: User): Promise<Event> {
    console.log(user);
    return await this.eventsRepository.save({
      ...input,
      user,
      organizer: user,
      at: new Date(input.at),
    });
  }

  public async updateEvent(
    event: Event,
    input: UpdateEventDto,
  ): Promise<Event> {
    return await this.eventsRepository.save({
      ...event,
      ...input,
      at: input.at ? new Date(input.at) : event.at,
    });
  }

  public async deleteEvent(id: number) {
    return await this.eventsRepository
      .createQueryBuilder('e')
      .delete()
      .where('id = :id', { id })
      .execute();
  }

  public async getEventsAttendeeByUserIdPaginated(
    userId: number,
    paginateOptions: PaginateOptions,
  ): Promise<PaginatedEvents> {
    return await paginate<Event>(
      this.getEventsAttendeeByUserIdQuery(userId),
      paginateOptions,
    );
  }

  private getEventsAttendeeByUserIdQuery(userId: number) {
    return this.getEventsBaseQuery()
      .leftJoinAndSelect('e.attendee', 'a')
      .where('a.userId = :userId', { userId });
  }
}
