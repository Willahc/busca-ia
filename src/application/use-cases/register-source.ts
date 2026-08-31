import { Source, SourceId, SourceType } from "@/domain";
import { SourceRepository } from "../ports/source-repository";
import { ConflictError } from "../errors/conflict-error";

export interface RegisterSourceInput {
  readonly id: SourceId;
  readonly type: SourceType;
  readonly label: string;
  readonly externalReference?: string;
  readonly isSynthetic?: boolean;
}

export class RegisterSource {
  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(input: RegisterSourceInput): Promise<Source> {
    const alreadyExists = await this.sourceRepository.exists(input.id);
    if (alreadyExists) {
      throw new ConflictError(`Source with identifier '${input.id}' already exists.`);
    }

    const source = new Source({
      id: input.id,
      type: input.type,
      label: input.label,
      externalReference: input.externalReference,
      isSynthetic: input.isSynthetic,
    });

    await this.sourceRepository.save(source);
    return source;
  }
}